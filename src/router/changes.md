# Changes

## Router

`router.getOptions`, `router.setOption` replaced by `options` class attribute
`buildState` -> `buildNodeState`

### To Do (Router)

1. adjust priorities(who in controll opf defaults?) and default values of pathOptions ? like put default values into the RouteNode instead of router and matchPath ?
2. force and reload (NavigationOptions) is more or less the same
3. Detect duplicate async calls and prevent this, to save possible network request. Deduplicate async calss with the same states.
4. decode \\ encode params
5. create `Redirect` error for convinience
6. Route.defaultParams should be `{}` after class initialization, to aviod unnecessary checks

## RouteNode

### To Do (RouteNode)

1. rename: `trailingSlashMode` to `honorSlash` ?
2. Do not let param inhere from parrent to children, why is this even a thing?
3. Do not let name Nodes without a route and place nameless and routless nodes as childs
4. accept `BuildOptions` and `MatchOptions` default params on initialization, allow owerride them when calling `buildPath` and `matchPath` (related to todo#1 from `router`)
5. check for path duplication, since we removed pathMap, probalby we can check pathMap every time we add a route ? Or just do not give a damn about duplicates.

## Search params

### To Do (Search params)

1. add new array method `comma`: `aray=one,two,three`
