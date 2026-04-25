const getFirebaseAuthHelperOrigin = () => {
    const origin = globalThis.process?.env?.FIREBASE_AUTH_HELPER_ORIGIN;

    if (!origin) {
        throw new Error("FIREBASE_AUTH_HELPER_ORIGIN is not configured.");
    }

    return origin.replace(/\/$/, "");
};

const getProxyTarget = (requestUrl) => {
    const url = new URL(requestUrl);
    const authPath = url.pathname.replace(/^\/api\/firebase-auth\/?/, "/__/auth/");
    const target = new URL(authPath, getFirebaseAuthHelperOrigin());
    target.search = url.search;
    return target;
};

const getProxyResponseHeaders = (upstreamResponse, target, requestUrl) => {
    const headers = new Headers(upstreamResponse.headers);
    const location = headers.get("location");

    if (location?.startsWith(target.origin)) {
        headers.set("location", location.replace(target.origin, new URL(requestUrl).origin));
    }

    return headers;
};

export default {
    async fetch(request) {
        let target;

        try {
            target = getProxyTarget(request.url);
        } catch (error) {
            return new Response(error.message, { status: 500 });
        }

        const upstreamResponse = await fetch(target, {
            method: request.method,
            headers: request.headers,
            body: request.method === "GET" || request.method === "HEAD" ? undefined : request.body,
            duplex: "half",
            redirect: "manual",
        });

        return new Response(upstreamResponse.body, {
            status: upstreamResponse.status,
            statusText: upstreamResponse.statusText,
            headers: getProxyResponseHeaders(upstreamResponse, target, request.url),
        });
    },
};
