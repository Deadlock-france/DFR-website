// Steam publie ses images sous forme de placeholders que le client Steam
// résout lui-même. Sans substitution, le navigateur les prend pour des chemins
// relatifs et déclenche un 404 sur notre domaine.
const STEAM_CLAN_IMAGE_BASE = "https://clan.steamstatic.com/images";

export const bbcodeToHtml = (bbcode: string) => {
    bbcode = bbcode.replace(/\{STEAM_CLAN(?:_LOC)?_IMAGE\}/gi, STEAM_CLAN_IMAGE_BASE);
    bbcode = bbcode.replace(/\[\/center\]/gi, "[/center]");
    bbcode = bbcode.replace(/\[\/right\]/gi, "[/right]");
    bbcode = bbcode.replace(/\[\/justify\]/gi, "[/justify]");
    bbcode = bbcode.replace(/\[(center|right|left)\][\s\S]*?\[\/\1\]/gmi, (match, align) => {
      const close_open_align = '[/' + align + '][' + align + ']';
      match = match.replace(/\[(h[1-4]|youtube|blockquote)\](.*?)\[\/\1\]/, close_open_align + '[$1]$2[/$1]' + close_open_align);
      match = match.replace(/\[indent data=(.*?)\](.*?)\[\/indent\]/, close_open_align + '[indent data=$1]$2[/indent]' + close_open_align);
      match = match.replace(/(?:<br>|\n)/gmi, close_open_align);
      match = match.replace(new RegExp('\\[' + align + '\\]\\[\\/' + align + '\\]', 'gmi'), "");
      return match;
    });
    bbcode = bbcode.replace(/\[size=1\](.*?)\[\/size\]/gmi, '<span style="font-size: 0.75em;">$1</span>');
    bbcode = bbcode.replace(/\[size=2\](.*?)\[\/size\]/gmi, '<span style="font-size: 0.75em;">$1</span>');
    bbcode = bbcode.replace(/\[size=3\](.*?)\[\/size\]/gmi, '$1');
    bbcode = bbcode.replace(/\[size=4\](.*?)\[\/size\]/gmi, '<span style="font-size: 1.5em;">$1</span>');
    bbcode = bbcode.replace(/\[size=5\](.*?)\[\/size\]/gmi, '<span style="font-size: 1.5em;">$1</span>');
    bbcode = bbcode.replace(/\[size=6\](.*?)\[\/size\]/gmi, '<span style="font-size: 2em;">$1</span>');
    bbcode = bbcode.replace(/\[size=7\](.*?)\[\/size\]/gmi, '<span style="font-size: 2em;">$1</span>');
    bbcode = bbcode.replace(/\[color=(.*?)\](.*?)\[\/color\]/gmi, '<span style="color:$1;">$2</span>');
    bbcode = bbcode.replace(/\[highlight=(.*?)\](.*?)\[\/highlight\]/gmi, '<span style="background-color:$1;">$2</span>');
    bbcode = bbcode.replace(/\[font="(.*?)"\](.*?)\[\/font\]/gmi, '$2');
    bbcode = bbcode.replace(/\[(center|right|justify)\]\[(h[1-4]|blockquote)\]\[indent data=(.*?)\]/gmi, (_m, align, tag, indent) => {
      const indentEm = parseInt(indent, 10) * 2;
      return `<${tag} style="text-align: ${align}; margin-left: ${indentEm}em;">`;
    });
    bbcode = bbcode.replace(/\[(center|right|justify)\]\[(h[1-4]|blockquote)\]/gmi, '<$2 style="text-align: $1;">');
    bbcode = bbcode.replace(/\[(h[1-4]|blockquote)\]\[indent data=(.*?)\]/gmi, (_m, tag, indent) => {
      const indentEm = parseInt(indent, 10) * 2;
      return `<${tag} style="margin-left: ${indentEm}em;">`;
    });
    bbcode = bbcode.replace(/\[(center|right|justify)\]\[youtube\](.*?)\[\/youtube\]\[\/(center|right|justify)\]/gi, '<iframe style="text-align: $1;" frameborder="0" allowfullscreen="true" src="https://www.youtube.com/embed/$2?showinfo=0"></iframe>');
    bbcode = bbcode.replace(/\[(center|right|justify)\]\[indent data=(.*?)\](.*?)\[\/indent\]\[\/(center|right|justify)\]\n?/gmi, (_m, align, indent, content) => {
      const indentEm = parseInt(indent, 10) * 2;
      return `<p style="text-align: ${align}; margin-left: ${indentEm}em;">${content}</p>`;
    });
    bbcode = bbcode.replace(/\[(center|right|justify)\]([\s\S]*?)\[\/\1\]\n?/gmi, '<p style="text-align: $1;">$2</p>');
    bbcode = bbcode.replace(/\[indent data=(.*?)\](.*?)\[\/indent\]\n?/gmi, (_m, indent, content) => {
      const indentEm = parseInt(indent, 10) * 2;
      return `<p style="margin-left: ${indentEm}em;">${content}</p>`;
    });
    bbcode = bbcode.replace(/\[b\]/gi, "<strong>");
    bbcode = bbcode.replace(/\[\/b\]/gi, "</strong>");
    bbcode = bbcode.replace(/\[i\]/gi, "<em>");
    bbcode = bbcode.replace(/\[\/i\]/gi, "</em>");
    bbcode = bbcode.replace(/\[u\]/gi, "<u>");
    bbcode = bbcode.replace(/\[\/u\]/gi, "</u>");
    bbcode = bbcode.replace(/\[s\]/gi, "<s>");
    bbcode = bbcode.replace(/\[\/s\]/gi, "</s>");
    bbcode = bbcode.replace(/\[quote\]/gi, "<blockquote>");
    bbcode = bbcode.replace(/\[\/quote\]/gi, "</blockquote>");
    bbcode = bbcode.replace(/\[code\]/gi, "<pre>");
    bbcode = bbcode.replace(/\[\/code\]/gi, "</pre>");
    bbcode = bbcode.replace(/\[sub\]/gi, "<sub>");
    bbcode = bbcode.replace(/\[\/sub\]/gi, "</sub>");
    bbcode = bbcode.replace(/\[sup\]/gi, "<sup>");
    bbcode = bbcode.replace(/\[\/sup\]/gi, "</sup>");
    bbcode = bbcode.replace(/\[h1\]/gi, "<h1>");
    bbcode = bbcode.replace(/\[\/(h[1-4])]\n?/gi, "</$1>");
    bbcode = bbcode.replace(/\[(h[1-4])\]/gi, "<$1>");
    bbcode = bbcode.replace(/\[\/indent\]/gi, "");
    bbcode = bbcode.replace(/\[\/center\]\n?/gi, "");
    bbcode = bbcode.replace(/\[\/right\]\n?/gi, "");
    bbcode = bbcode.replace(/\[\/justify\]\n?/gi, "");
    bbcode = bbcode.replace(/\[hr\]/gi, "");
    bbcode = bbcode.replace(/\[p\]/gi, "<p>");
    bbcode = bbcode.replace(/\[\/p\]/gi, "</p>");
    bbcode = bbcode.replace(/\[email(.*?)\]/gi, "");
    bbcode = bbcode.replace(/\[\/email\]/gi, "");
    bbcode = bbcode.replace(/\[left\]/gi, "");
    bbcode = bbcode.replace(/\[\/left\]/gi, "");
    bbcode = bbcode.replace(/\[ml\]\[ol\](.*?)\[\/ol\]\[\/ml\]/gmi, "<ol>$1</ol>");
    bbcode = bbcode.replace(/\[ml\]\[ul\](.*?)\[\/ul\]\[\/ml\]/gmi, "<ul>$1</ul>");
    bbcode = bbcode.replace(/\[ol(.*?)\]/gi, "");
    bbcode = bbcode.replace(/\[\/ol\]/gi, "");
    bbcode = bbcode.replace(/\[ul(.*?)\]/gi, "");
    bbcode = bbcode.replace(/\[\/ul\]/gi, "");
    bbcode = bbcode.replace(/\[li indent=(.*?) align=(.*?)\]/gi, (_x, indentStr, alignment) => {
      const styles = [];
      if (indentStr !== '0') {
        const indentEm = parseInt(indentStr, 10) * 2;
        styles.push(`margin-left: ${indentEm}em`);
      }
      if (alignment !== 'left') {
        styles.push(`text-align: ${alignment}`);
      }
      if (styles.length > 0) {
        return `<li style="${styles.join('; ')};">`;
      }
      return "<li>";
    });
    bbcode = bbcode.replace(/\[li\]/gi, "<li>");
    bbcode = bbcode.replace(/\[\/li\]/gi, "</li>");
    // Steam / DeepL mettent parfois des sauts de ligne dans [img]…[/img] :
    // le `.` ne les traverse pas, d'où l'usage de [\s\S] + trim de l'URL.
    bbcode = bbcode.replace(
      /\[img width=(.*?)\]([\s\S]*?)\[\/img\]/gmi,
      (_m, width: string, src: string) =>
        `<img src="${src.trim()}" width="${width}">`,
    );
    bbcode = bbcode.replace(/\[img src="(.*?)"\](?:\[\/img\])?/gmi, '<img src="$1">');
    bbcode = bbcode.replace(
      /\[img\]([\s\S]*?)\[\/img\]/gmi,
      (_m, src: string) => `<img src="${src.trim()}">`,
    );
    bbcode = bbcode.replace(/\[url=(.*?)\](.*?)\[\/url\]/gi, '<a href="$1" target="_blank">$2</a>');
    bbcode = bbcode.replace(/\[youtube\](.*?)\[\/youtube\]/gi, '<iframe frameborder="0" allowfullscreen="true" src="https://www.youtube.com/embed/$1?showinfo=0"></iframe>');
    bbcode = bbcode.replace(/\[video\](.*?)\[\/video\]/gi, '<iframe frameborder="0" allowfullscreen="true" src="$1"></iframe>');
    bbcode = bbcode.replace(/\n/gi, "<br>");
    return bbcode;
  };
  