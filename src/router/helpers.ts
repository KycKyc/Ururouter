/**
 * Generate id for state.meta
 * @returns
 */
export function generateId() {
    return 'xxxx-yxxx'.replace(/[xy]/g, (c) => {
        let r = (Math.random() * 16) | 0,
            v = c === 'x' ? r : (r & 0x3) | 0x8;

        return v.toString(16);
    });
}
