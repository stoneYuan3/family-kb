const API_URL = process.env.NEXT_PUBLIC_API_URL

let token: string | null = null;
export function setToken(t: string | null) {
    token = t;
    if (t) {
        localStorage.setItem("token", t);
    } else {
        localStorage.removeItem("token");
    }    
}
export function getToken(): string | null {
    if (!token) {
        token = localStorage.getItem("token");
    }
    return token;
}

async function request<T>(
    endpoint: string,
    options: RequestInit = {}
): Promise<T> {

    const headers: Record<string, string> = {
        "Content-Type": "application/json",
        ...(options.headers as Record<string, string>),
    };

    if (token) {
        headers["authorization"] = `Bearer ${token}`;
    }
    console.log(options)
    const res = await fetch(`${API_URL}${endpoint}`, {
        ...options,
        headers,
    })

    if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || body.message || `Request failed: ${res.status}`);
    }

    return res.json()
}

export const api = {
    get<T>(endpoint: string) {
        return request<T>(endpoint);
    },
    post<T>(endpoint: string, data?: unknown) {
        return request<T>(endpoint, {
            method: "POST",
            body: data ? JSON.stringify(data) : undefined,
        });
    },
    put<T>(endpoint: string, data?: unknown) {
        return request<T>(endpoint, {
            method: "PUT",
            body: data ? JSON.stringify(data) : undefined,
        });
    },
    delete<T>(endpoint: string) {
        return request<T>(endpoint, { method: "DELETE" });
    },
    async upload<T>(endpoint: string, formData: FormData, method: "POST" | "PUT" = "POST"): Promise<T> {

        const headers: Record<string, string> = {};
        if (token) {
            headers["Authorization"] = `Bearer ${token}`;
        }

        const res = await fetch(`${API_URL}${endpoint}`, {
            method,
            headers,
            body: formData,
        });

        if (!res.ok) {
            const body = await res.json().catch(() => ({}));
            throw new Error(body.error || body.message || `Upload failed: ${res.status}`);
        }

        return res.json();
    }
}