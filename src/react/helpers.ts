export const isActive = (name: string, names: string[]): boolean => {
    if (name.indexOf('*') === -1) {
        return names.indexOf(name) !== -1;
    }

    console.debug(name, names);
    let compareTo = name.split('.');
    for (let treeName of names) {
        let compareWith = treeName.split('.');
        let active = compareTo.every((part, index) => {
            if (part === '*' && compareWith[index] !== undefined) {
                return true;
            }

            return part === compareWith[index];
        });

        if (active) return true;
    }

    return false;
};
