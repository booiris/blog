'use strict';

const { URL } = require('url');
const { decodeURL } = require('hexo-util');
const { log } = require('console');

function slugize(str) {
    // 移除所有非字母数字字符，但保留中文字符
    str = str.replace(/[^\w\s\u4e00-\u9fa5]/g, '');
    // 将所有字母转换为小写
    str = str.toLowerCase();
    // 将所有的空格替换为连字符
    str = str.replace(/\s+/g, '-');
    return str;
}

hexo.extend.filter.register('before_post_render', function (post) {
    // 当前文档对应页面的绝对路径，类似 /path/to/file/fliename/
    let page_url = new URL(post.permalink);
    let cur_pagepath = page_url.pathname;
    // 校准相对路径，hexo 以 asset 文件夹为参考，所以加 ../
    // \ 替换为 /
    let corr_rel_path = path => {
        if (path) {
            let temp = path.replace(/\\/g, '/')
            if (path[0] != '/') {
                temp = '../' + temp
            }
            return temp
        } else {
            return ''
        }
    };

    // 匹配 []() 形式，但链接中包含 :// 的不匹配，来排除超链接
    post.content = post.content.replace(/(?<!\!)\[([^\[\]]+?)\]\((?![^)]+\:\/\/)([^\s)]+?)\)/g,
        function (match_str, label, rel_path) {
            // console.log(rel_path)
            const temp_path = rel_path;
            let is_mdlink = false;
            rel_path = rel_path.replace(/((\S+)\.md)$|((\S+)\.md)?(#(.*))$/, (_0, _1, md_path1, _3, md_path2, _5, fragment) => {
                is_mdlink = true;
                let md_path = md_path1 ?? md_path2 ?? '';
                if (md_path.endsWith("index") && !cur_pagepath.includes(".html")) {
                    md_path += ".html"
                }
                if (md_path) {
                    if (cur_pagepath.includes(".html")) {
                        md_path = corr_rel_path(md_path) + '.html';
                    } else if (!md_path.endsWith(".html")) {
                        md_path = corr_rel_path(md_path) + '/';  // hexo 的 post url 以 / 结尾
                    }
                }

                // console.log(md_path1, md_path2, temp_path, md_path, cur_pagepath)

                // url fragment 部分按 hexo-renderer-marked 的方法 slugize 后作为 "anchorId"
                // decodeURL 解决 obsidian 的空格用 %20 表示的问题
                return md_path + (fragment ? '#' + slugize(decodeURL(fragment)) : '')
            });

            // console.log(rel_path, cur_pagepath, is_mdlink)

            if (!is_mdlink)
                rel_path = corr_rel_path(rel_path);

            if (temp_path[0] == '/') {
                return `[${label}](${rel_path})`;
            }

            if (cur_pagepath.endsWith(".html")) {
                cur_pagepath += "/"
            }

            // console.log(temp_path, cur_pagepath)

            let new_str = `[${label}](${cur_pagepath}${rel_path})`;
            // console.debug("[CHANGE] " + match_str + " -> " + new_str);
            return new_str;
        });

    return post;
});
