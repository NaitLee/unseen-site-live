//@ts-check
///<reference path="./dash-xml.d.ts" />

const DS = '-';
const SP = ' ';
const DSSP = ' - ';
const DDSP = ' -- ';
const DSLF = ' -';
const DDSLF = ' --';
const XMLDECL = '?';
const XMLENTY = '!';
const XMLCMNT = '!--';
export const FRAG_TAG = '--';
const FRAG_START = FRAG_TAG + SP;

/** @enum {number} */
export const Flag = {
    Valid: 1 << 0,
    Close: 1 << 1,
    Void: 1 << 2,
    Inln: 1 << 3,
    Decl: 1 << 4,
    Enty: 1 << 5,
    Cmnt: 1 << 6,
    Frag: 1 << 7
};

/**
 * @param {string} line A line
 * @returns {Flag}
 */
export function dashXmlScanLine(line) {
    /** @type {Flag} */
    let flags = 0;
    line = line.trimStart();
    if (line.length === 0)
        return 0;
    if (line === DS)
        return Flag.Valid | Flag.Close;
    if (line.endsWith(DSLF))
        flags |= Flag.Valid;
    else if (line.endsWith(DDSLF)) {
        flags |= Flag.Valid | Flag.Void;
        if (line.startsWith(FRAG_START))
            flags |= Flag.Frag;
    } else
        return 0;
    if (line.indexOf(DDSP) !== -1) {
        if (flags & Flag.Void)
            flags |= Flag.Inln;
        else
            return 0;
    }
    if (line.startsWith(XMLCMNT))
        flags |= Flag.Cmnt;
    else if (line[0] == XMLDECL)
        flags |= Flag.Decl;
    else if (line[0] === XMLENTY)
        flags |= Flag.Enty;
    return flags;
}

/**
 * @param {string} rawline A line
 * @param {Flag} flags Flags for this line via `dashXmlScanLine`
 * @param {string[]} stack Provide an empty array by yourself
 * @returns {string}
 */
export function dashXmlTranslateLine(rawline, flags, stack) {
    if (!(flags & Flag.Valid))
        return rawline;
    const line = rawline.trimStart();
    const indent = rawline.slice(0, rawline.length - line.length);
    if (flags & Flag.Close)
        return indent + '</' + stack.pop() + '>';
    const end = line.length - ((flags & Flag.Void) ? DDSLF.length : DSLF.length);
    const double_at = line.indexOf(DDSP);
    const segstr = line.slice(0, double_at === -1 ? end : double_at);
    const segs = segstr.split(DSSP);
    const head = segs[0];
    let result = indent + '<' + head;
    for (let i = 1; i < segs.length; ++i) {
        const seg = segs[i].replaceAll(' ---', ' -');
        const space_at = seg.indexOf(SP);
        if (space_at === -1)
            result += SP + seg;
        else
            result += SP + seg.slice(0, space_at) + '="' + seg.slice(space_at + 1) + '"';
    }
    if (flags & Flag.Cmnt)
        result += ' -->';
    else if (flags & Flag.Decl)
        result += '?>';
    else if (flags & Flag.Enty)
        result += '>';
    else if (flags & Flag.Inln)
        result += '>' + line.slice(double_at + DDSP.length, end) + '</' + head + '>';
    else if (flags & Flag.Void)
        result += ' />'; else {
        result += '>';
        stack.push(head);
    }
    return result;
}

/**
 * @param {string} rawline A line
 * @param {DashXmlNode[]} treestack Provide an empty array by yourself
 * @returns {void}
 */
export function dashXmlParseTree(rawline, treestack) {
    const flags = dashXmlScanLine(rawline);
    /** @type {DashXmlNode} */
    const node = {
        tag: FRAG_TAG,
        attributes: {},
        content: '',
        indent: '',
        flags: flags,
        children: []
    };
    if (treestack.length === 0) {
        treestack.push({
            tag: FRAG_TAG,
            attributes: {},
            content: '',
            indent: '',
            flags: flags | Flag.Frag,
            children: []
        });
    }
    const current = treestack[treestack.length - 1];
    if (!(flags & Flag.Valid)) {
        node.content = rawline + '\n';
        current.children.push(node);
        return;
    }
    const line = rawline.trimStart();
    const indent = rawline.slice(0, rawline.length - line.length);
    node.indent = indent;
    if (flags & Flag.Close) {
        treestack.pop();
        return;
    }
    /*
    if (flags & Flag.Frag) {
        node.content = line.slice(FRAG_START.length, line.length - DDSLF.length);
        current.children.push(node);
        return;
    }
    */
    const end = line.length - ((flags & Flag.Void) ? DDSLF.length : DSLF.length);
    const double_at = line.indexOf(DDSP);
    const segstr = line.slice(0, double_at === -1 ? end : double_at);
    const segs = segstr.split(DSSP);
    const head = segs[0];
    node.tag = head;
    for (let i = 1; i < segs.length; ++i) {
        const seg = segs[i].replaceAll(' ---', ' -');
        const space_at = seg.indexOf(SP);
        if (space_at === -1)
            node.attributes[seg] = undefined;
        else
            node.attributes[seg.slice(0, space_at)] = seg.slice(space_at + 1);
    }
    if (flags & Flag.Inln)
        node.content = line.slice(double_at + DDSP.length, end);
    current.children.push(node);
    if (!(flags & (Flag.Void | Flag.Inln)))
        treestack.push(node);
}

/**
 * @param {DashXmlNode} tree
 * @param {{
 *  compact?: boolean,
 *  escape?: boolean
 * }} options
 * @returns {string}
 */
export function dashXmlTreeToString(tree, options) {
    const newline = options.compact ? '' : '\n';
    /** @type {string} */
    let result = '';
    /**
     * @param {DashXmlNode} node
     */
    function traverse(node) {
        const flags = node.flags;
        const indent = options.compact ? '' : node.indent;
        if (options.escape)
            node.content = node.content.replaceAll('<', '&lt;').replaceAll('>', '&gt;');
        if (!(flags & Flag.Valid)) {
            result += node.content;
            return;
        }
        if (flags & Flag.Close) {
            result += indent + '</' + node.tag + '>' + newline;
            return;
        }
        if (flags & Flag.Frag) {
            for (const child of node.children)
                traverse(child);
            return;
        }
        result += indent + '<' + node.tag;
        for (const key in node.attributes)
            result += ' ' + key + (node.attributes[key] === undefined ? '' : ('="' + node.attributes[key] + '"'));
        if (flags & Flag.Inln)
            result += '>' + node.content + '</' + node.tag + '>' + newline;
        else if (flags & Flag.Cmnt)
            result += node.content + ' -->' + newline;
        else if (flags & Flag.Enty)
            result += '>' + newline;
        else if (flags & Flag.Decl)
            result += '?>' + newline;
        else if (flags & Flag.Void)
            result += ' />' + newline;
        else
            result += '>' + node.content + newline;
        for (const child of node.children)
            traverse(child);
        if (!(flags & (Flag.Void)))
            result += indent + '</' + node.tag + '>' + newline;
    }
    traverse(tree);
    return result;
}
