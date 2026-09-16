import { useForm } from "@tanstack/react-form";
import { useMutation } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { Loader2, UserPlus } from "lucide-react";
import { toast } from "sonner";
import { z } from "zod";
import { Input, Password } from "#/components/pro/base/fields/input";
import { Button } from "#/components/ui/button";
import { Label } from "#/components/ui/label";
import { authClient } from "#/features/auth/auth-client";
import { installationErrorMessage } from "#/features/installation/error-message";
import { installSystemFn } from "#/features/installation/server/functions";
import { InstallLayout } from "#/layouts/install";
import { m } from "#/paraglide/messages";

export function InstallPage() {
	const navigate = useNavigate();
	const installMutation = useMutation({
		mutationFn: installSystemFn,
		onSuccess: async (installation, variables) => {
			const signedIn = await authClient.signIn
				.email({
					email: installation.email,
					password: variables.data.password,
					callbackURL: "/admin",
				})
				.catch(() => null);
			toast.success(m.install_success());
			if (signedIn && !signedIn.error) {
				await navigate({ to: "/admin", replace: true });
				return;
			}
			navigate({
				to: "/sign-in",
				search: { redirect: "/admin" },
				replace: true,
			});
		},
		onError: (error) => {
			toast.error(installationErrorMessage(error));
		},
	});
	const formSchema = z
		.object({
			name: z.string().min(1, m.install_nameRequired()),
			email: z.email({
				error: (issue) =>
					issue.input === "" ? m.auth_email_required() : undefined,
			}),
			password: z
				.string()
				.min(1, m.auth_password_required())
				.min(12, m.auth_password_min()),
			confirmPassword: z.string().min(1, m.install_confirmPasswordRequired()),
		})
		.refine((value) => value.password === value.confirmPassword, {
			path: ["confirmPassword"],
			message: m.install_passwordMismatch(),
		});
	const form = useForm({
		defaultValues: {
			name: String(m.install_root_default_name()),
			email: "",
			password: "",
			confirmPassword: "",
		},
		validators: { onSubmit: formSchema },
		onSubmit: ({ value }) => install(value),
	});

	function install(values: z.infer<typeof formSchema>) {
		installMutation.mutate({
			data: {
				name: values.name,
				email: values.email,
				password: values.password,
			},
		});
	}

	return (
		<InstallLayout>
			<div className="space-y-6">
				<div className="space-y-2 text-center">
					<h1 className="font-semibold text-2xl tracking-tight">
						{m.install_title()}
					</h1>
					<p className="text-muted-foreground text-sm">
						{m.install_description()}
					</p>
				</div>

				<form
					className="grid gap-3"
					onSubmit={(event) => {
						event.preventDefault();
						void form.handleSubmit();
					}}
				>
					<form.Field name="name">
						{(field) => (
							<TanStackField
								field={field}
								id="install-name"
								label={m.install_nameLabel()}
							/>
						)}
					</form.Field>
					<form.Field name="email">
						{(field) => (
							<TanStackField
								field={field}
								id="install-email"
								label={m.common_email()}
								placeholder="root@example.com"
							/>
						)}
					</form.Field>
					<form.Field name="password">
						{(field) => (
							<TanStackField
								field={field}
								id="install-password"
								label={m.common_password()}
								password
							/>
						)}
					</form.Field>
					<form.Field name="confirmPassword">
						{(field) => (
							<TanStackField
								field={field}
								id="install-confirm-password"
								label={m.install_confirmPasswordLabel()}
								password
							/>
						)}
					</form.Field>
					<Button className="mt-2" disabled={installMutation.isPending}>
						{installMutation.isPending ? (
							<Loader2 className="animate-spin" />
						) : (
							<UserPlus />
						)}
						{m.install_submit()}
					</Button>
				</form>
			</div>
		</InstallLayout>
	);
}

type StringField = {
	name: string;
	state: {
		value: string;
		meta: { errors: readonly ({ message: string } | undefined)[] };
	};
	handleBlur: () => void;
	handleChange: (value: string) => void;
};

function TanStackField({
	field,
	id,
	label,
	password = false,
	placeholder,
}: {
	field: StringField;
	id: string;
	label: string;
	password?: boolean;
	placeholder?: string;
}) {
	const error = field.state.meta.errors[0]?.message;
	const Control = password ? Password : Input;
	return (
		<div className="grid gap-2">
			<Label htmlFor={id}>{label}</Label>
			<Control
				aria-describedby={error ? `${id}-error` : undefined}
				aria-invalid={Boolean(error)}
				id={id}
				name={field.name}
				onBlur={field.handleBlur}
				onChange={(event) => field.handleChange(event.currentTarget.value)}
				placeholder={placeholder ?? (password ? "********" : undefined)}
				value={field.state.value}
			/>
			{error ? (
				<p className="text-sm text-destructive" id={`${id}-error`}>
					{error}
				</p>
			) : null}
		</div>
	);
}
