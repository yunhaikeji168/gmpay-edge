import { useSiteBrand } from "#/context/site-brand-provider";
import { UserAuthForm } from "#/features/auth/components/user-auth-form";
import { m } from "#/paraglide/messages";

type SignInProps = {
	redirectTo?: string;
};

export function SignIn({ redirectTo = "/admin" }: SignInProps) {
	const brand = useSiteBrand();
	return (
		<div className="w-full space-y-6">
			<div className="space-y-2">
				<p className="font-medium text-primary text-sm">{brand.name}</p>
				<h1 className="font-semibold text-3xl tracking-tight">
					{m.auth_signIn_title()}
				</h1>
				<p className="text-muted-foreground leading-6">
					{m.auth_signIn_description()}
				</p>
			</div>
			<UserAuthForm redirectTo={redirectTo} />
		</div>
	);
}
