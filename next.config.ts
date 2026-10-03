import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["@prisma/client", "nodemailer", "pdf-lib", "unpdf"],
};

export default nextConfig;
