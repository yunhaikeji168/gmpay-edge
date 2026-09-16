import { createContext, type ReactNode, useContext, useState } from "react";

type AuthAnimationState = {
	isTyping: boolean;
	passwordLength: number;
	showPassword: boolean;
	setIsTyping: (value: boolean) => void;
	setPasswordLength: (value: number) => void;
	setShowPassword: (value: boolean) => void;
};

const AuthAnimationContext = createContext<AuthAnimationState | null>(null);

export function AuthAnimationProvider({ children }: { children: ReactNode }) {
	const [isTyping, setIsTyping] = useState(false);
	const [passwordLength, setPasswordLength] = useState(0);
	const [showPassword, setShowPassword] = useState(false);
	return (
		<AuthAnimationContext.Provider
			value={{
				isTyping,
				passwordLength,
				setIsTyping,
				setPasswordLength,
				setShowPassword,
				showPassword,
			}}
		>
			{children}
		</AuthAnimationContext.Provider>
	);
}

export function useAuthAnimation() {
	const context = useContext(AuthAnimationContext);
	if (!context)
		throw new Error(
			"useAuthAnimation must be used inside AuthAnimationProvider",
		);
	return context;
}
