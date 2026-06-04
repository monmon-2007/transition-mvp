import NextAuth, { AuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import GoogleProvider from "next-auth/providers/google";
import { sendWelcomeEmail } from "@/lib/emails";

const backend = (
  process.env.BACKEND_URL ||
  process.env.BACKEND_LOGIN_URL ||
  "http://localhost:4000"
).replace(/\/$/, "");

const providers: AuthOptions["providers"] = [
  CredentialsProvider({
    name: "Credentials",
    credentials: {
      email: { label: "Email", type: "text" },
      password: { label: "Password", type: "password" },
    },
    async authorize(credentials) {
      if (!credentials) return null;
      try {
        const res = await fetch(`${backend}/auth/login`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(credentials),
        });
        if (!res.ok) return null;
        return await res.json();
      } catch (err) {
        console.error("Credentials authorize error:", err);
        return null;
      }
    },
  }),
];

// Only add Google provider if credentials are configured
if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
  providers.unshift(
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      authorization: {
        params: {
          prompt: "consent",
          access_type: "offline",
          response_type: "code",
        },
      },
    })
  );
}

const authOptions: AuthOptions = {
  providers,
  session: { strategy: "jwt" },
  pages: {
    signIn: "/login",
    error: "/login",
  },
  callbacks: {
    async signIn({ user, account }) {
      // For credentials provider, the backend already knows the user
      if (account?.provider === "credentials") return true;

      // For Google (or other OAuth), register/link the user in the backend
      if (account?.provider === "google" && user.email) {
        try {
          const secret = process.env.INTERNAL_API_SECRET;
          const backendUrl = (
            process.env.BACKEND_URL || "http://localhost:8080"
          ).replace(/\/$/, "");

          const res = await fetch(`${backendUrl}/auth/social-login`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              ...(secret ? { "X-Internal-Secret": secret } : {}),
            },
            body: JSON.stringify({
              provider: "google",
              providerId: account.providerAccountId,
              email: user.email,
              name: user.name || "",
              image: user.image || "",
            }),
          });

          if (res.ok) {
            const data = await res.json();
            // Store the backend user ID on the user object so jwt callback can pick it up
            (user as any).backendId = String(data.id);
            (user as any).accessToken = data.accessToken || data.token;

            // Send welcome email for newly created OAuth users
            if (data.created) {
              sendWelcomeEmail(user.email!, user.name || "").catch((err: unknown) =>
                console.error("OAuth welcome email failed:", err)
              );
            }
          } else {
            // If social-login endpoint doesn't exist yet, fall back to using
            // the provider account ID. Log the error for debugging.
            console.warn(
              "Backend social-login returned",
              res.status,
              "— falling back to provider ID"
            );
            (user as any).backendId = `google_${account.providerAccountId}`;
          }
        } catch (err) {
          console.error("Social login backend call failed:", err);
          // Don't block sign-in — use a prefixed fallback ID
          (user as any).backendId = `google_${account.providerAccountId}`;
        }
      }

      return true;
    },

    async jwt({ token, user, account }: any) {
      if (user) {
        // Prefer backend-assigned ID, then user.id (credentials), then sub (OAuth)
        token.id = user.backendId || user.id;
        token.accessToken =
          user.accessToken || user.token || account?.access_token;
        token.name = user.name;
        token.picture = user.image;
        token.provider = account?.provider;
      }
      return token;
    },

    async session({ session, token }: any) {
      session.user = session.user || {};
      (session.user as any).id = token.id || token.sub;
      (session.user as any).accessToken = token.accessToken;
      (session.user as any).name = token.name;
      (session.user as any).image = token.picture;
      (session.user as any).provider = token.provider;
      return session;
    },
  },
};

const handler = NextAuth(authOptions);
export { handler as GET, handler as POST, authOptions };
