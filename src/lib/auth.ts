import { NextAuthOptions } from "next-auth"
import CredentialsProvider from "next-auth/providers/credentials"
import prisma from "@/lib/prisma"

function pseudoHash(str: string) {
  let hash = 0
  if (str.length === 0) return hash.toString()
  for (let i = 0; i < str.length; i++) {
    const chr = str.charCodeAt(i)
    hash = ((hash << 5) - hash) + chr
    hash |= 0
  }
  return "atelie_" + Math.abs(hash).toString(16)
}

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: { label: "E-mail", type: "email" },
        senha: { label: "Senha", type: "password" }
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.senha) {
          throw new Error("Dados inválidos.")
        }

        const user = await prisma.user.findUnique({ 
          where: { email: credentials.email } 
        })

        if (!user || user.senha !== pseudoHash(credentials.senha)) {
          throw new Error("E-mail ou senha inválidos.")
        }

        if (!user.ativo) {
          throw new Error("Usuário desativado. Contate o administrador!")
        }

        return {
          id: user.id.toString(),
          name: user.nome,
          email: user.email,
          nivel: user.nivel
        }
      }
    })
  ],
  session: {
    strategy: "jwt",
    maxAge: 8 * 60 * 60, // 8 horas
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id
        token.nivel = (user as any).nivel
      }
      return token
    },
    async session({ session, token }) {
      if (token && session.user) {
        (session.user as any).id = token.id;
        (session.user as any).nivel = token.nivel;
      }
      return session
    }
  },
  pages: {
    signIn: '/',
  },
  secret: process.env.NEXTAUTH_SECRET || "chave_super_secreta_padrao_em_dev"
}
