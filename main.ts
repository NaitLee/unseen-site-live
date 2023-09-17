import { contentType } from "https://deno.land/std@0.201.0/media_types/mod.ts";
import { Status } from "https://deno.land/std@0.201.0/http/http_status.ts";
import { DASH_FILE_SUFFIX, DEF_MIME_STATIC, DEF_MIME_STUFF, NOT_FOUND_PAGE, PATH_STATIC, PATH_STUFFS } from "./src/constants.ts";
import { requestPage } from "./src/dash-pages.ts";
import { dashXmlScanLine, dashXmlTranslateLine } from "./src/dash-xml-core.js";

async function pageResponse(name: string) {
    const page = await requestPage(name);
    return new Response(page.content, {
        status: page.status,
        headers: {
            'Content-Type': page.mimetype
        }
    });
}

Deno.serve({}, async function(request: Request) {
    const url = new URL(request.url);
    const path = url.pathname.slice(1);
    const ext = path.split('.').at(-1)!;
    if (path.startsWith(PATH_STATIC)) {
        const response = await fetch(new URL(path, import.meta.url)).then(r => r.ok ? r : null).catch(() => null);
        if (response === null)
            return pageResponse(NOT_FOUND_PAGE);
        const new_response = new Response(response.body, {
            headers: { 'Content-Type': contentType(ext) || DEF_MIME_STATIC }
        })
        return new_response;
    }
    if (path.startsWith(PATH_STUFFS)) {
        const response = await fetch(new URL(path + DASH_FILE_SUFFIX, import.meta.url)).then(r => r.ok ? r : null).catch(() => null);
        if (response === null)
            return pageResponse(NOT_FOUND_PAGE);
        let content = '';
        const stack: string[] = [];
        for (const line of (await response.text()).split('\n')) {
            const flags = dashXmlScanLine(line);
            content += dashXmlTranslateLine(line, flags, stack);
        }
        return new Response(content, {
            headers: { 'Content-Type': contentType(ext) || DEF_MIME_STUFF }
        });
    }
    // path bandaids
    if (url.pathname.startsWith('/pages/'))
        return new Response(null, {
            status: Status.MovedPermanently,
            headers: { 'Location': url.pathname.slice('/pages'.length) }
        });
    if (url.pathname.endsWith('.html'))
        return new Response(null, {
            status: Status.MovedPermanently,
            headers: { 'Location': url.pathname.slice(0, -'.html'.length) }
        });
    if (path === 'favicon.ico')
        return new Response(null, {
            status: Status.Found,
            headers: { 'Location': '/static/favicon.ico' }
        });
    return pageResponse(path || 'index');
});
