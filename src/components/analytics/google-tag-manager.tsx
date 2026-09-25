import Script from "next/script";

// Google Tag Manager. Container ID is public. The base snippet auto-tracks SPA
// route changes, so no per-navigation wiring is needed.
const GTM_ID = "GTM-MK7RTJR";

// Loads the GTM container. `afterInteractive` keeps it off the critical path;
// GTM buffers dataLayer pushes made before it loads, so the initial PageView is
// not lost. Render inside <head> via the root layout.
export function GoogleTagManager() {
  return (
    <Script id="gtm" strategy="afterInteractive">
      {`(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':
new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],
j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src=
'https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);
})(window,document,'script','dataLayer','${GTM_ID}');`}
    </Script>
  );
}

// The <noscript> fallback GTM wants immediately after the opening <body>.
export function GoogleTagManagerNoScript() {
  return (
    <noscript>
      <iframe
        src={`https://www.googletagmanager.com/ns.html?id=${GTM_ID}`}
        height="0"
        width="0"
        style={{ display: "none", visibility: "hidden" }}
        title="Google Tag Manager"
      />
    </noscript>
  );
}
