import NextAuth, { AuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";

// NOTE: set NEXTAUTH_SECRET in your environment for production

const authOptions: AuthOptions = {
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "text" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials) return null;
        const backend = process.env.BACKEND_URL || process.env.BACKEND_LOGIN_URL || "http://localhost:4000";
        try {
          const res = await fetch(`${backend.replace(/\/$/, "")}/auth/login`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(credentials),
          });
          if (!res.ok) return null;
          const data = await res.json();
          // Expect the backend to return a user object (and optionally token/accessToken)
          return data;
        } catch (err) {
          console.error("Credentials authorize error:", err);
          return null;
        }
      },
    }),
  ],
  session: { strategy: "jwt" },
  callbacks: {
    async jwt({ token, user }: any) {
      if (user) {
        token.accessToken = user.accessToken || user.token;
        token.id = user.id; // Store user ID in token
        token.name = user.name;
      }
      return token;
    },
    async session({ session, token }: any) {
      session.user = session.user || {};
      (session.user as any).accessToken = token.accessToken;
      (session.user as any).id = token.id; // Include user ID in session
      (session.user as any).name = token.name;
      return session;
    },
  },
};

const handler = NextAuth(authOptions);
export { handler as GET, handler as POST, authOptions };
