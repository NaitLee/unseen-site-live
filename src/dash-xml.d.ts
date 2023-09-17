
interface DashXmlNode {
    tag: string;
    attributes: {
        [name: string]: string | undefined
    };
    indent: string;
    content: string;
    flags: Flag;
    children: DashXmlNode[];
}

declare enum Flag {
    Valid = 1 << 0,
    Close = 1 << 1,
    Void = 1 << 2,
    Inln = 1 << 3,
    Decl = 1 << 4,
    Enty = 1 << 5,
    Cmnt = 1 << 6,
    Frag = 1 << 7
}
