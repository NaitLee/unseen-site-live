import { DASH_FILE_SUFFIX, NOT_FOUND_PAGE, PATH_DECOS, PATH_PAGES } from "./constants.ts";
import { Flag, dashXmlParseTree, dashXmlTreeToString } from "./dash-xml-core.js";
import { Page } from "./types.ts";
import CC from "./cc.ts";

async function fetchDashRoot(path: string) {
    const content = await fetch(new URL('../' + path, import.meta.url)).then(r => r.text()).catch(() => '');
    if (!content) return null;
    const treestack: DashXmlNode[] = [];
    for (const line of content.split('\n'))
        dashXmlParseTree(line, treestack);
    return treestack[0] ?? null;
}

// deno-lint-ignore no-explicit-any
function metadataFromRoot(root: DashXmlNode, defaults?: Record<string, any>) {
    const first_child = root.children[0];
    if (first_child === undefined) return {};
    return Object.assign({}, defaults || {}, (first_child && (first_child.flags & Flag.Frag)) ? first_child.attributes : {});
}

interface PageOptions {
    accepts_languages: string[];
}

export async function requestPage(name: string, options: PageOptions): Promise<Page> {
    let root: DashXmlNode | null = null;
    let lang = '';
    let cc: ((s: string) => string) | null = null;
    for (lang of options.accepts_languages) {
        if (['zh-CN', 'zh-HK', 'zh-TW'].indexOf(lang) !== -1) {
            cc = CC[lang as 'zh-CN' | 'zh-HK' | 'zh-TW'];
            lang = 'zh-Hant-CN';
        }
        root = await fetchDashRoot(PATH_PAGES + lang + '/' + name + DASH_FILE_SUFFIX);
        if (root !== null) break;
    }
    if (lang !== 'zh-Hant-CN')
        cc = null;
    if (root === null) {
        if (name !== NOT_FOUND_PAGE) {
            const page = await requestPage(NOT_FOUND_PAGE, options);
            page.status = 404;
            return page;
        } else
            return {
                status: 404,
                content: 'Not Found',
                mimetype: 'text/plain;charset=utf-8'
            };
    }
    function apply_params(node: DashXmlNode, params: Record<string, string | undefined>, children: DashXmlNode[]) {
        function apply(node2: DashXmlNode) {
            for (const key in node2.attributes) {
                const value = node2.attributes[key];
                if (value && value.startsWith('--'))
                    node2.attributes[key] = params[value.slice(2)] || '';
            }
            for (const key in params)
                if (node2.content === '--' + key && params[key] !== undefined)
                    node2.content = params[key]!;
            for (const child of node2.children)
                apply(child);
        }
        apply(node);
        for (const child of children)
            apply(child);
        function put_frag(node2: DashXmlNode) {
            if ((node2.flags & Flag.Frag) && Object.entries(node2.attributes).length === 0 && node2.children.length === 0) {
                node2.children.push(...children);
                return true;
            }
            for (const child of node2.children)
                if (put_frag(child))
                    return true;
            return false;
        }
        put_frag(node);
    }
    async function traverse(node: DashXmlNode) {
        const initial = node.tag.charCodeAt(0);
        if (initial >= 0x41 && initial <= 0x5a) { // [A..Z]
            const decoroot = await fetchDashRoot(PATH_DECOS + node.tag + DASH_FILE_SUFFIX);
            if (decoroot !== null) {
                const params = Object.assign(metadataFromRoot(decoroot), node.attributes);
                apply_params(decoroot, params, node.children);
                node = await traverse(decoroot);
            }
        }
        for (const i in node.children)
            node.children[i] = await traverse(node.children[i]);
        return node;
    }
    const metadata = metadataFromRoot(root, {
        status: 200,
        mimetype: 'text/html',
        charset: 'utf-8',
        compact: false,
        escape: true
    });
    const newroot = await traverse(root);
    const content = dashXmlTreeToString(newroot, {
        compact: metadata.compact,
        escape: metadata.escape
    });
    return {
        status: metadata.status,
        content: cc === null ? content : cc(content),
        mimetype: metadata.mimetype + ';charset=' + metadata.charset
    };
}
