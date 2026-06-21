import Script from "next/script";

/**
 * Google Tag Manager container (GTM-N8SZ8VT3). Loads the gtm.js loader with the
 * `afterInteractive` strategy — the strategy Next documents for tag managers, so
 * the container boots right after hydration without blocking first paint. The
 * `<noscript>` iframe is the JS-disabled fallback and must render as the first
 * child of `<body>`, so place this component there. Renders the loader + fallback;
 * no visible output.
 *
 * Container ID is public (it ships in page source regardless), so it's inlined
 * rather than read from env. To stop GTM firing on dev/preview traffic, wrap the
 * returned fragment in `process.env.NODE_ENV === "production" && (...)`.
 */
const GTM_ID = "GTM-N8SZ8VT3";

export function GoogleTagManager() {
  return (
    <>
      <Script id="gtm-loader" strategy="afterInteractive">
        {`(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':
new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],
j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src=
'https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);
})(window,document,'script','dataLayer','${GTM_ID}');`}
      </Script>
      <noscript>
        <iframe
          src={`https://www.googletagmanager.com/ns.html?id=${GTM_ID}`}
          height="0"
          width="0"
          style={{ display: "none", visibility: "hidden" }}
          title="Google Tag Manager"
        />
      </noscript>
    </>
  );
}
