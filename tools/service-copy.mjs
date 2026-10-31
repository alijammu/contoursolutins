// Consort Technologies provides Ekahau survey services without claiming
// an official partnership, partner-directory listing, or certification.
export function updateServiceCopy(html) {
  html = html.replace(/Optimize Your Wireless Network with Ekahau Surveys\s*-Performed by a Certified Partner(?:\s*\([^<)]*\))?/gi, 'Ekahau Wireless Survey Services');
  html = html.replace(/Ekahau Wireless Survey Services Looking to improve your Wi-Fi performance\? We(?:’|'|&#8217;|&rsquo;)re a proud official partner of \.\./gi, 'Improve Wi-Fi coverage and performance with our Ekahau wireless survey services.');
  html = html.replace(/We(?:’|'|&#8217;|&rsquo;)re a proud official partner of Ekahau, a leader in Wi-Fi network optimization solutions\./gi, 'We provide wireless site surveys using Ekahau tools to assess Wi-Fi coverage, performance, and interference.');
  html = html.replace(/<p>Visit Ekahau(?:’|'|&#8217;|&rsquo;)s Partner Locator to see our listing:\s*https:\/\/www\.ekahau\.com\/partners\/<\/p>/gi, '');
  html = html.replace(/<p>Visit Ekahau(?:’|'|&#8217;|&rsquo;)s Partner Locator to see our listing:\s*https:\/\/www\.ekahau\.com\/partners\//gi, '');
  // Remove the Ekahau logo's entire partner-grid column, preserving the others.
  html = html.replace(/<div class="wpb_column vc_column_container vc_col-sm-3"><div class="vc_column-inner"><div class="wpb_wrapper">\s*<div\s+class="wpb_single_image[^"<]*"[^>]*>\s*<figure[^>]*>\s*<div[^>]*><img\b[^>]*2017_Ekahau[^>]*><\/div>\s*<\/figure>\s*<\/div>\s*<\/div><\/div><\/div>/gi, '');
  html = html.replace(/Our certified technicians utilize Ekahau/gi, 'Our technicians use Ekahau');
  html = html.replace(/The Benefits of Ekahau Surveys for NetworkOptimization \(assuming this is a service offered\)/g, 'The Benefits of Ekahau Surveys for Network Optimization');
  return html;
}
