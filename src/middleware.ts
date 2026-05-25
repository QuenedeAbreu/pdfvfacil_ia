import { withAuth } from "next-auth/middleware"

export default withAuth({
  pages: {
    signIn: "/",
  },
})

export const config = {
  matcher: [
    "/pdv/:path*",
    "/estoque/:path*",
    "/kits/:path*",
    "/relatorios/:path*",
    "/usuarios/:path*",
    "/dashboard/:path*"
  ]
}
