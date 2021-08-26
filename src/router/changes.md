# Changes

## Router

`router.getOptions`, `router.setOption` replaced by `options` class attribute
`buildState` -> `buildNodeState`

### To Do (Router)

1. adjust priorities(who in controll opf defaults?) and default values of pathOptions ? like put default values into the RouteNode instead of router and matchPath ?
2. force and reload (NavigationOptions) is more or less the same
3. Detect duplicate async calls and prevent this, to save possible network request. Deduplicate async calss with the same states.

## RouteNode

### To Do (RouteNode)

1. rename: `trailingSlashMode` to `honoreSlash` ?
2. Better slash detection algorhytm? check `experimental` tests
3. force slash before every path, remove line 32 in match Children?
4. Do not let param inhere from parrent to children, why is this even a thing?
5. Do not let name Nodes without a route and place nameless and routless nodes as childs
6. accept `BuildOptions` and `MatchOptions` default params on initialization, allow owerride them when calling `buildPath` and `matchPath`

*Complex:*
do we need nameMap, maybe we can work with only pathName? Will require major rework, probably not worth it

## Search params

### To Do (Search params)

1. add new array method `comma`: `aray=one,two,three`
