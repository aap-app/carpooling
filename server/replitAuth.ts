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
      sameSite: 'lax', // Allow cookies during OAuth redirects
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
  // Google OAuth uses 'given_name' and 'family_name', while some providers use 'first_name' and 'last_name'
  // Also try 'name' as a fallback if individual name fields aren't available
  const firstName = claims["first_name"] || claims["given_name"] || claims["name"]?.split(" ")[0] || "";
  const lastName = claims["last_name"] || claims["family_name"] || claims["name"]?.split(" ").slice(1).join(" ") || "";
  
  console.log("Upserting user with claims:", {
    sub: claims["sub"],
    email: claims["email"],
    firstName,
    lastName,
    availableClaims: Object.keys(claims)
  });
  
  await storage.upsertUser({
    id: claims["sub"],
    email: claims["email"],
    firstName,
    lastName,
    profileImageUrl: claims["profile_image_url"] || claims["picture"],
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
    console.log("LOGIN - Query params:", req.query);
    console.log("LOGIN - Session ID:", req.sessionID);
    
    // Store invitation flag and code in session if present
    if (req.query.invitation === 'true') {
      (req.session as any).pendingInvitation = true;
      if (req.query.code) {
        (req.session as any).invitationCode = req.query.code as string;
      }
      
      console.log("LOGIN - Setting invitation flags:", {
        pendingInvitation: (req.session as any).pendingInvitation,
        invitationCode: (req.session as any).invitationCode
      });
      
      // Save session before OAuth redirect to ensure data persists
      req.session.save((err) => {
        if (err) {
          console.error("LOGIN - Session save error:", err);
          return next(err);
        }
        console.log("LOGIN - Session saved successfully, redirecting to OAuth");
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
    console.log("CALLBACK - Session ID:", req.sessionID);
    console.log("CALLBACK - Session data:", {
      pendingInvitation: (req.session as any).pendingInvitation,
      invitationCode: (req.session as any).invitationCode,
      requiresInvitationCode: (req.session as any).requiresInvitationCode
    });
    
    passport.authenticate(`replitauth:${req.hostname}`, (err: any, user: any) => {
      if (err || !user) {
        console.error("CALLBACK - Auth error:", err);
        return res.redirect("/api/login");
      }
      
      req.logIn(user, (loginErr) => {
        if (loginErr) {
          console.error("CALLBACK - Login error:", loginErr);
          return next(loginErr);
        }
        
        console.log("CALLBACK - User logged in successfully");
        
        // Check if this was an invitation-based signup
        const pendingInvitation = (req.session as any).pendingInvitation;
        console.log("CALLBACK - Checking pendingInvitation:", pendingInvitation);
        
        if (pendingInvitation) {
          // Clear the pending flag and set requires invitation flag
          delete (req.session as any).pendingInvitation;
          (req.session as any).requiresInvitationCode = true;
          
          console.log("CALLBACK - Setting requiresInvitationCode, saving session");
          
          // Save session before redirect to ensure flags persist
          req.session.save((saveErr) => {
            if (saveErr) {
              console.error("CALLBACK - Session save error:", saveErr);
              return next(saveErr);
            }
            
            console.log("CALLBACK - Session saved, redirecting to complete-invitation");
            
            // Pass invitation code to complete-invitation page if available
            const invitationCode = (req.session as any).invitationCode;
            if (invitationCode) {
              return res.redirect(`/complete-invitation?code=${encodeURIComponent(invitationCode)}`);
            }
            return res.redirect("/complete-invitation");
          });
        } else {
          // Normal login flow
          console.log("CALLBACK - Normal login, redirecting to /");
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

  console.log("AUTH CHECK - Path:", req.path, "Method:", req.method);
  console.log("AUTH CHECK - Is authenticated:", req.isAuthenticated());
  console.log("AUTH CHECK - User exists:", !!user);
  console.log("AUTH CHECK - Has expires_at:", !!user?.expires_at);

  if (!req.isAuthenticated() || !user?.expires_at) {
    console.log("AUTH CHECK - FAILED: Not authenticated or no expires_at");
    return res.status(401).json({ message: "Unauthorized" });
  }

  // Check if user has a pending invitation that needs to be completed
  // Allow the validation endpoint itself to pass through
  const pendingInvitation = (req.session as any).requiresInvitationCode;
  const isValidationEndpoint = req.path === "/api/invitations/validate" && req.method === "POST";
  
  console.log("AUTH CHECK - requiresInvitationCode:", pendingInvitation);
  console.log("AUTH CHECK - isValidationEndpoint:", isValidationEndpoint);
  
  if (pendingInvitation && !isValidationEndpoint) {
    console.log("AUTH CHECK - BLOCKED: Invitation code required");
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
