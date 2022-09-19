import rules from './rules';

export interface Token {
    /**
     * like: `url-parameter` | `url-parameter-splat` | etc.
     */
    type: string;
    /**
     *  String that shat was matched token regex.
     *  like for `/item/:whatever`, matches will be: `/`, `item`, `/`, `:whatever`
     */
    match: string;
    // Param name
    paramName: string;
    /** Constrain of param, defined as another regex */
    constrain: string[];
    regex?: RegExp;
}

const tokenise = (str: string): Token[] => {
    let tokens: Token[] = [];
    // console.debug(`Tokenize this: ${str}`);
    while (str.length > 0) {
        let segmentMatched = false;
        for (let rule of rules) {
            // console.debug(str);
            let match = str.match(rule.pattern);
            if (!match) continue;
            segmentMatched = true;
            // console.debug(match);
            tokens.push({
                type: rule.type,
                match: match[0],
                paramName: match.slice(1, 2)[0],
                constrain: match.slice(2),
                regex: rule.regex instanceof Function ? rule.regex(match) : rule.regex,
            });

            str = str.substring(match[0].length);
            break;
        }

        if (!segmentMatched) {
            throw new Error(`Could not parse path '${str}'`);
        }
    }

    return tokens;
};

export default tokenise;
