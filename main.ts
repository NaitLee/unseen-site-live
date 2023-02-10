
import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { serveDir } from "https://deno.land/std@0.177.0/http/file_server.ts";
import { Status, STATUS_TEXT } from "https://deno.land/std@0.177.0/http/http_status.ts";
import { TextLineStream } from "https://deno.land/std@0.177.0/streams/mod.ts";
import { typeByExtension } from "https://deno.land/std@0.177.0/media_types/type_by_extension.ts";

import { DashXmlTemplate, DashXmlWithTemplate } from "https://codeberg.org/NaitLee/dash-xml/raw/tag/0.0.1/dash-xml-with-template.ts";

const DashXmlPossibleSuffices = new Set(['.html', '.htm', '.xml', '.svg']);
const DM_SUFFIX = '.dm';

const wwwroot = (Deno.args.at(0) ?? '.') + '/';
const port = parseInt(Deno.args.at(1) ?? '8080');

const template = new DashXmlTemplate();
const decoder = new TextDecoder();

for await (const entry of Deno.readDir('templates')) {
    if (!entry.isFile || !entry.name.endsWith(DM_SUFFIX)) continue;
    console.log('Adding templates from', entry.name);
    await Deno.readFile('templates/' + entry.name)
        .then(content => template.addTemplate(decoder.decode(content)))
        .catch(_ => void 0);
}

async function streamDashXml(path: string) {
    const file = await Deno.open(wwwroot + path);
    const dash = new DashXmlWithTemplate(template);
    const dash_stream = new TransformStream<string, string>({
        transform(line, controller) {
            for (const output of dash.yieldLine(line))
                controller.enqueue(output + '\n');
        }
    });
    return file.readable
        .pipeThrough(new TextDecoderStream())
        .pipeThrough(new TextLineStream())
        .pipeThrough(dash_stream)
        .pipeThrough(new TextEncoderStream());
}

function getSuffix(path: string) {
    const last_dot_index = path.lastIndexOf('.')
    return last_dot_index === -1 ? '' : path.slice(last_dot_index);
}

function serveDashOrHtml(request: Request, urlpath?: string): Promise<Response> {
    const path = wwwroot + (urlpath ?? new URL(request.url).pathname);
    const suffix = getSuffix(path);
    const dmpath = (suffix === '' ? path : path.slice(0, -suffix.length)) + DM_SUFFIX;
    return streamDashXml(dmpath)
        .then(stream => new Response(stream, {
            headers: {
                'Content-Type': typeByExtension(suffix) ?? 'text/xml'
            }
        }))
        .catch(_ => notFound(request, path));
}

function notFound(request: Request, _missing_path?: string): Promise<Response> {
    return serveDashOrHtml(request, '/not-found.html')
        .catch(_error => new Response(STATUS_TEXT[Status.NotFound], {
            status: Status.NotFound,
            statusText: STATUS_TEXT[Status.NotFound]
        }));
}

serve(function(request) {
    const url = new URL(request.url);
    if (url.pathname === '/')
        url.pathname = '/index.html';
    const suffix = getSuffix(url.pathname);
    if (DashXmlPossibleSuffices.has(suffix))
        return serveDashOrHtml(request, url.pathname)
            .catch(_error => notFound(request));
    return serveDir(request, {
        fsRoot: wwwroot
    }).then(response => {
        if (response.status === Status.NotFound)
            return notFound(request);
        if (url.pathname.endsWith('.dm'))
            response.headers.set('Content-Type', 'text/plain;charset=utf-8');
        return response;
    }).catch(error => new Response(error, {
        status: Status.InternalServerError,
        statusText: STATUS_TEXT[Status.InternalServerError]
    }));
}, {
    port: port
});
