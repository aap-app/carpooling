import * as client from "openid-client";
import { Strategy, type VerifyFunction } from "openid-client/passport";

import passport from "passport";
import session from "express-session";
import type { Express, RequestHandler } from "express";
import memoize from "memoizee";
import connectPg from "connect-pg-simple";
import { storage } from "./storage";

if (!process.env.REPLIT_DOMAINS) {
  throw new Error("Environment variable REPLIT_DOMAINS not provided");
}

const getOidcConfig = memoize(
  async () => {
    return await client.discovery(
      new URL(process.env.ISSUER_URL ?? "https://replit.com/oidc"),
      process.env.REPL_ID!
    );
  },
  { maxAge: 3600 * 1000 }
);

export function getSession() {
  const sessionTtl = 7 * 24 * 60 * 60 * 1000; // 1 week
  const pgStore = connectPg(session);
  const sessionStore = new pgStore({
    conString: process.env.DATABASE_URL,
    createTableIfMissing: false,
    ttl: sessionTtl,
    tableName: "sessions",
  });
  return session({
    secret: process.env.SESSION_SECRET!,
    store: sessionStore,
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      maxAge: sessionTtl,
    },
  });
}

function updateUserSession(
  user: any,
  tokens: client.TokenEndpointResponse & client.TokenEndpointResponseHelpers
) {
  user.claims = tokens.claims();
  user.access_token = tokens.access_token;
  user.refresh_token = tokens.refresh_token;
  user.expires_at = user.claims?.exp;
}

async function upsertUser(
  claims: any,
) {
  await storage.upsertUser({
    id: claims["sub"],
    email: claims["email"],
    firstName: claims["first_name"],
    lastName: claims["last_name"],
    profileImageUrl: claims["profile_image_url"],
  });
}

export async function setupAuth(app: Express) {
  app.set("trust proxy", 1);
  app.use(getSession());
  app.use(passport.initialize());
  app.use(passport.session());

  const config = await getOidcConfig();

  const verify: VerifyFunction = async (
    tokens: client.TokenEndpointResponse & client.TokenEndpointResponseHelpers,
    verified: passport.AuthenticateCallback
  ) => {
    const claims = tokens.claims();
    if (!claims) {
      return verified(new Error("No claims in token"), false);
    }
    const email = claims["email"] as string;
    
    // Check OAuth restrictions
    const restrictionsSetting = await storage.getSetting("oauth_restrictions");
    if (restrictionsSetting?.value) {
      const restrictions = restrictionsSetting.value as {
        allowedDomains: string[];
        allowedGitHubOrgs: string[];
      };
      
      // If allowed domains are configured, check email domain
      if (restrictions.allowedDomains && restrictions.allowedDomains.length > 0) {
        const emailDomain = email.split("@")[1]?.toLowerCase();
        const isAllowedDomain = restrictions.allowedDomains.some(
          domain => emailDomain === domain.toLowerCase()
        );
        
        if (!isAllowedDomain) {
          return verified(new Error("Your email domain is not authorized to access this application"), false);
        }
      }
      
      // TODO: GitHub org validation
      // This would require checking if the user is a member of allowed GitHub orgs
      // This is complex because it requires GitHub API access and the provider info from claims
      // For now, domain validation applies to all providers
    }
    
    const user = {};
    updateUserSession(user, tokens);
    await upsertUser(claims);
    verified(null, user);
  };

  for (const domain of process.env
    .REPLIT_DOMAINS!.split(",")) {
    const strategy = new Strategy(
      {
        name: `replitauth:${domain}`,
        config,
        scope: "openid email profile offline_access",
        callbackURL: `https://${domain}/api/callback`,
      },
      verify,
    );
    passport.use(strategy);
  }

  passport.serializeUser((user: Express.User, cb) => cb(null, user));
  passport.deserializeUser((user: Express.User, cb) => cb(null, user));

  app.get("/api/login", (req, res, next) => {
    // Store invitation flag and code in session if present
    if (req.query.invitation === 'true') {
      (req.session as any).pendingInvitation = true;
      if (req.query.code) {
        (req.session as any).invitationCode = req.query.code as string;
      }
      
      // Save session before OAuth redirect to ensure data persists
      req.session.save((err) => {
        if (err) {
          console.error("Session save error:", err);
          return next(err);
        }
        passport.authenticate(`replitauth:${req.hostname}`, {
          prompt: "login consent",
          scope: ["openid", "email", "profile", "offline_access"],
        })(req, res, next);
      });
    } else {
      // No invitation, proceed directly with auth
      passport.authenticate(`replitauth:${req.hostname}`, {
        prompt: "login consent",
        scope: ["openid", "email", "profile", "offline_access"],
      })(req, res, next);
    }
  });

  app.get("/api/callback", (req, res, next) => {
    passport.authenticate(`replitauth:${req.hostname}`, (err: any, user: any) => {
      if (err || !user) {
        return res.redirect("/api/login");
      }
      
      req.logIn(user, (loginErr) => {
        if (loginErr) {
          return next(loginErr);
        }
        
        // Check if this was an invitation-based signup
        const pendingInvitation = (req.session as any).pendingInvitation;
        if (pendingInvitation) {
          // Clear the pending flag and set requires invitation flag
          delete (req.session as any).pendingInvitation;
          (req.session as any).requiresInvitationCode = true;
          
          // Save session before redirect to ensure flags persist
          req.session.save((saveErr) => {
            if (saveErr) {
              console.error("Session save error in callback:", saveErr);
              return next(saveErr);
            }
            
            // Pass invitation code to complete-invitation page if available
            const invitationCode = (req.session as any).invitationCode;
            if (invitationCode) {
              return res.redirect(`/complete-invitation?code=${encodeURIComponent(invitationCode)}`);
            }
            return res.redirect("/complete-invitation");
          });
        } else {
          // Normal login flow
          return res.redirect("/");
        }
      });
    })(req, res, next);
  });

  app.get("/api/logout", (req, res) => {
    req.logout(() => {
      res.redirect(
        client.buildEndSessionUrl(config, {
          client_id: process.env.REPL_ID!,
          post_logout_redirect_uri: `${req.protocol}://${req.hostname}`,
        }).href
      );
    });
  });
}

export const isAuthenticated: RequestHandler = async (req, res, next) => {
  const user = req.user as any;

  if (!req.isAuthenticated() || !user.expires_at) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  // Check if user has a pending invitation that needs to be completed
  // Allow the validation endpoint itself to pass through
  const pendingInvitation = (req.session as any).requiresInvitationCode;
  const isValidationEndpoint = req.path === "/api/invitations/validate" && req.method === "POST";
  
  if (pendingInvitation && !isValidationEndpoint) {
    return res.status(403).json({ 
      message: "Invitation code required",
      requiresInvitationCode: true 
    });
  }

  const now = Math.floor(Date.now() / 1000);
  if (now <= user.expires_at) {
    return next();
  }

  const refreshToken = user.refresh_token;
  if (!refreshToken) {
    res.status(401).json({ message: "Unauthorized" });
    return;
  }

  try {
    const config = await getOidcConfig();
    const tokenResponse = await client.refreshTokenGrant(config, refreshToken);
    updateUserSession(user, tokenResponse);
    return next();
  } catch (error) {
    res.status(401).json({ message: "Unauthorized" });
    return;
  }
};
