// https://github.com/nk2028/opencc-js
import * as OpenCC from 'https://esm.sh/opencc-js@1.0.5/core';
import * as Locale from 'https://esm.sh/opencc-js@1.0.5/preset';

export function readDict(path: string) {
    return Deno.readTextFileSync(path).trim().split('\n').map(l => l.split('\t'));
}

const dict_patch_cn = readDict('src/patch-cn.txt');
const dict_patch_quotes = [['「', '“'], ['」', '”'], ['『', '‘'], ['』', '’']];
const dict_patch_twp = readDict('src/patch-twp.txt');

// source pages are in opencc standard, no need "Locale.from"

const cc_cn = OpenCC.ConverterFactory(
    Locale.to.cn.concat([dict_patch_cn, dict_patch_quotes, [['zh-Hant-CN', 'zh-CN']]])
);
const cc_hk = OpenCC.ConverterFactory(
    Locale.to.hk.concat([dict_patch_quotes, [['zh-Hant-CN', 'zh-HK']]])
);
const cc_tw = OpenCC.ConverterFactory(
    Locale.to.twp.concat([dict_patch_twp, [['zh-Hant-CN', 'zh-TW']]])
);

export default {
    cn: cc_cn,
    hk: cc_hk,
    tw: cc_tw,
    'zh-CN': cc_cn,
    'zh-HK': cc_hk,
    'zh-TW': cc_tw
};
