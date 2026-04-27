"use client";

import {
    createContext,
    useContext,
    useState,
    useEffect,
    useCallback,
    type ReactNode,
} from "react";
import { api, setToken, getToken } from "@/lib/api";
import type { User } from "@/types";

interface AuthContextType {
    user: User | null;
    login: (email: string, password: string) => Promise<void>;
    logout: () => void;
    updateUser: (user: User) => void;
    loading: boolean;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
    const [user, setUser] = useState<User | null>(null);
    const [loading, setLoading] = useState(true);

    const login = useCallback(async (email: string, password: string) => {
        const data = await api.post<{ token: string; user: User }>(
            "/auth/login",
            { email, password }
        );
        setToken(data.token);
        setUser(data.user);
        localStorage.setItem("user", JSON.stringify(data.user));

    }, []);

    const logout = useCallback(() => {
        setToken(null);
        setUser(null);
        localStorage.removeItem("user");
        localStorage.removeItem("token");
    }, []);

    const updateUser = useCallback((u: User) => {
        setUser(u);
        localStorage.setItem("user", JSON.stringify(u));
    }, []);

    useEffect(() => {
        const savedToken = getToken();
        const savedUser = localStorage.getItem("user");
        if (savedToken && savedUser) {
            setUser(JSON.parse(savedUser));
        }
        setLoading(false);
    }, []);


    return (
        <AuthContext value={{ user, login, logout, updateUser, loading }}>
            {children}
        </AuthContext>
    );

}

export function useAuth() {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error("useAuth must be used within an AuthProvider");
    }
    return context;
}