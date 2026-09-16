import { Header } from "#/layouts/components/header";
import { LocaleSwitch } from "#/layouts/components/locale-switch";
import { ProfileDropdown } from "#/layouts/components/profile-dropdown";
import { Search } from "#/layouts/components/search";
import { ThemeSwitch } from "#/layouts/components/theme-switch";
import { TopNav } from "#/layouts/components/top-nav";

interface AppHeaderProps {
	fixed?: boolean;
	topNav?: {
		title: string;
		href: string;
		isActive: boolean;
		disabled?: boolean;
	}[];
}

export function AppHeader({ fixed = true, topNav }: AppHeaderProps) {
	return (
		<Header fixed={fixed}>
			{topNav ? <TopNav links={topNav} /> : <Search />}
			<div className="ms-auto flex items-center space-x-4">
				{topNav ? <Search /> : null}
				<LocaleSwitch />
				<ThemeSwitch />
				<ProfileDropdown />
			</div>
		</Header>
	);
}
