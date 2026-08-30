// shared/state/globalState.js

const GlobalState = (() => {

    const state = {
        activeTool: "lab",
        volumeData: [],
        journalData: [],
        sortConfig: {
            key: null,
            direction: "desc"
        }
    };

    const listeners = [];

    function get(key) {
        return state[key];
    }

    function set(key, value) {
        state[key] = value;
        notify(key, value);
    }

    function update(partial) {
        Object.assign(state, partial);
        Object.keys(partial).forEach(k => notify(k, state[k]));
    }

    function subscribe(fn) {
        listeners.push(fn);
    }

    function notify(key, value) {
        listeners.forEach(fn => fn(key, value));
    }

    return {
        get,
        set,
        update,
        subscribe
    };
})();

export default GlobalState;
