/**
 * We encode using encodeURIComponent but we want to
 * preserver certain characters which are commonly used
 * (sub delimiters and ':')
 * 
 * https://www.ietf.org/rfc/rfc3986.txt
 * 
 * reserved    = gen-delims / sub-delims
 * 
 * gen-delims  = ":" / "/" / "?" / "#" / "[" / "]" / "@"
 * 
 * sub-delims  = "!" / "$" / "&" / "'" / "(" / ")"
              / "*" / "+" / "," / ";" / "="
 */
import { URLParamsEncodingType } from 'types/base';

const excludeSubDelimiters = /[^$+,;|:]/g;

export const encodeURIComponentExcludingSubDelims = (segment: string): string => segment.replace(excludeSubDelimiters, (match) => encodeURIComponent(match));

const encodingMethods: Record<URLParamsEncodingType, (param: string) => string> = {
    default: encodeURIComponentExcludingSubDelims,
    uriComponent: encodeURIComponent,
    none: (val) => val,
};

const decodingMethods: Record<URLParamsEncodingType, (param: string) => string> = {
    default: decodeURIComponent,
    uriComponent: decodeURIComponent,
    none: (val) => val,
};

export const encodeParam = (param: string | number | boolean, encoding: URLParamsEncodingType, isSpatParam: boolean): string => {
    const encoder = encodingMethods[encoding] || encodeURIComponentExcludingSubDelims;

    if (isSpatParam) {
        return String(param).split('/').map(encoder).join('/');
    }

    return encoder(String(param));
};

export const decodeParam = (param: string, encoding: URLParamsEncodingType): string => (decodingMethods[encoding] || decodeURIComponent)(param);
