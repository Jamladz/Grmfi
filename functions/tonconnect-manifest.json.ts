export const onRequest: any = async (context: any) => {
  const url = new URL(context.request.url);
  const origin = url.origin;

  const manifest = {
    url: origin,
    name: "GRMF Fi",
    iconUrl: "https://i.suar.me/vAdG5/l",
    termsOfUseUrl: origin,
    privacyPolicyUrl: origin,
  };

  return new Response(JSON.stringify(manifest, null, 2), {
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, OPTIONS",
      "Cache-Control": "public, max-age=3600",
    },
  });
};
