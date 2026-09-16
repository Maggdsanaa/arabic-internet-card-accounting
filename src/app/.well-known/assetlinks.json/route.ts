import { NextResponse } from "next/server";

export const dynamic = "force-static";

export async function GET() {
  return NextResponse.json([
    {
      relation: ["delegate_permission/common.handle_all_urls"],
      target: {
        namespace: "android_app",
        package_name: "com.maggdsanaa.arabiccardaccounting",
        sha256_cert_fingerprints: [
          "A0:02:F7:22:F0:46:0F:E6:E0:43:D2:90:8D:D5:78:27:20:C0:87:6F:A7:5B:6D:19:3D:CC:63:98:D8:1B:BB:D8",
        ],
      },
    },
  ]);
}
