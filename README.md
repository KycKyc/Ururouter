# Readme

## General

### To Do

1. Better pathParser, strip down unnecessary code, introduce strickier standarts and get rid of all unnecessary conditions after that.
2. Remove `strictTrailingSlash` have no use in terms of path matching.

## Router

### To Do (Router)

1. adjust priorities(who in controll of defaults?) and default values of pathOptions ? like put default values into the RouteNode instead of router and matchPath ?
2. force and reload (NavigationOptions) is more or less the same ?
3. Detect duplicate async calls and prevent this, to save possible network request. Deduplicate async calls with the same states.
4. decode \\ encode params
5. hash in the path, add new `hash` param to navigation call?
6. console warnings\errors for 404 and other navigation events ?

## RouteNode

### To Do (RouteNode)

1. Do not let param inherit from parrent to children, why is this even a thing?
2. Do not let name Nodes without a route and place nameless and routless nodes as childs
3. accept `BuildOptions` and `MatchOptions` default params on initialization, allow owerride them when calling `buildPath` and `matchPath` (related to todo#1 from `router`)

## Search params

Fork it?

### To Do (Search params)

1. add new array method `comma`: `aray=one,two,three`
