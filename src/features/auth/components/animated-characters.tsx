/* biome-ignore-all lint/complexity/noExcessiveCognitiveComplexity: keeping the original GSAP interaction logic intact for fidelity */
/* biome-ignore-all lint/complexity/noForEach: keeping the ported GSAP animation logic close to the reference implementation */
import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import { useEffect, useRef, useState } from "react";

if (typeof document !== "undefined") {
	gsap.registerPlugin(useGSAP);
}

interface PupilProps {
	maxDistance?: number;
	pupilColor?: string;
	size?: number;
}

function Pupil({
	size = 12,
	maxDistance = 5,
	pupilColor = "#2D2D2D",
}: PupilProps) {
	return (
		<div
			className="pupil rounded-full"
			data-max-distance={maxDistance}
			style={{
				backgroundColor: pupilColor,
				height: size,
				width: size,
				willChange: "transform",
			}}
		/>
	);
}

interface EyeBallProps {
	eyeColor?: string;
	maxDistance?: number;
	pupilColor?: string;
	pupilSize?: number;
	size?: number;
}

function EyeBall({
	size = 48,
	pupilSize = 16,
	maxDistance = 10,
	eyeColor = "white",
	pupilColor = "#2D2D2D",
}: EyeBallProps) {
	return (
		<div
			className="eyeball flex items-center justify-center overflow-hidden rounded-full"
			data-max-distance={maxDistance}
			style={{
				backgroundColor: eyeColor,
				height: size,
				width: size,
				willChange: "height",
			}}
		>
			<div
				className="eyeball-pupil rounded-full"
				style={{
					backgroundColor: pupilColor,
					height: pupilSize,
					width: pupilSize,
					willChange: "transform",
				}}
			/>
		</div>
	);
}

export interface AnimatedCharactersProps {
	isTyping?: boolean;
	passwordLength?: number;
	showPassword?: boolean;
}

export function AnimatedCharacters({
	isTyping = false,
	showPassword = false,
	passwordLength = 0,
}: AnimatedCharactersProps) {
	const containerRef = useRef<HTMLDivElement>(null);
	const prefersReducedMotion = usePrefersReducedMotion();
	const mouseRef = useRef({ x: 0, y: 0 });
	const rafIdRef = useRef(0);

	const purpleRef = useRef<HTMLDivElement>(null);
	const blackRef = useRef<HTMLDivElement>(null);
	const yellowRef = useRef<HTMLDivElement>(null);
	const orangeRef = useRef<HTMLDivElement>(null);

	const purpleFaceRef = useRef<HTMLDivElement>(null);
	const blackFaceRef = useRef<HTMLDivElement>(null);
	const yellowFaceRef = useRef<HTMLDivElement>(null);
	const orangeFaceRef = useRef<HTMLDivElement>(null);
	const yellowMouthRef = useRef<HTMLDivElement>(null);

	const purpleBlinkTimerRef = useRef<ReturnType<typeof setTimeout>>(undefined);
	const purpleBlinkResetTimerRef =
		useRef<ReturnType<typeof setTimeout>>(undefined);
	const blackBlinkTimerRef = useRef<ReturnType<typeof setTimeout>>(undefined);
	const blackBlinkResetTimerRef =
		useRef<ReturnType<typeof setTimeout>>(undefined);
	const purplePeekTimerRef = useRef<ReturnType<typeof setTimeout>>(undefined);
	const purplePeekResetTimerRef =
		useRef<ReturnType<typeof setTimeout>>(undefined);
	const lookingTimerRef = useRef<ReturnType<typeof setTimeout>>(undefined);

	const isLookingRef = useRef(false);
	const isHidingPassword = passwordLength > 0 && !showPassword;
	const isShowingPassword = passwordLength > 0 && showPassword;

	const stateRef = useRef({
		isHidingPassword,
		isLooking: false,
		isShowingPassword,
		isTyping,
	});
	stateRef.current = {
		isHidingPassword,
		isLooking: isLookingRef.current,
		isShowingPassword,
		isTyping,
	};

	const { contextSafe } = useGSAP(
		() => {
			if (prefersReducedMotion) return;
			gsap.set(".pupil", { x: 0, y: 0 });
			gsap.set(".eyeball-pupil", { x: 0, y: 0 });
		},
		{
			scope: containerRef,
			dependencies: [prefersReducedMotion],
			revertOnUpdate: true,
		},
	);

	const quickToRef = useRef<{
		purpleSkew: gsap.QuickToFunc;
		blackSkew: gsap.QuickToFunc;
		orangeSkew: gsap.QuickToFunc;
		yellowSkew: gsap.QuickToFunc;
		purpleX: gsap.QuickToFunc;
		blackX: gsap.QuickToFunc;
		purpleHeight: gsap.QuickToFunc;
		purpleFaceLeft: gsap.QuickToFunc;
		purpleFaceTop: gsap.QuickToFunc;
		blackFaceLeft: gsap.QuickToFunc;
		blackFaceTop: gsap.QuickToFunc;
		orangeFaceX: gsap.QuickToFunc;
		orangeFaceY: gsap.QuickToFunc;
		yellowFaceX: gsap.QuickToFunc;
		yellowFaceY: gsap.QuickToFunc;
		mouthX: gsap.QuickToFunc;
		mouthY: gsap.QuickToFunc;
	} | null>(null);

	useEffect(() => {
		if (prefersReducedMotion) return;
		if (
			!(
				purpleRef.current &&
				blackRef.current &&
				orangeRef.current &&
				yellowRef.current &&
				purpleFaceRef.current &&
				blackFaceRef.current &&
				orangeFaceRef.current &&
				yellowFaceRef.current &&
				yellowMouthRef.current
			)
		) {
			return;
		}

		const quickTo = {
			blackFaceLeft: gsap.quickTo(blackFaceRef.current, "left", {
				duration: 0.3,
				ease: "power2.out",
			}),
			blackFaceTop: gsap.quickTo(blackFaceRef.current, "top", {
				duration: 0.3,
				ease: "power2.out",
			}),
			blackSkew: gsap.quickTo(blackRef.current, "skewX", {
				duration: 0.3,
				ease: "power2.out",
			}),
			blackX: gsap.quickTo(blackRef.current, "x", {
				duration: 0.3,
				ease: "power2.out",
			}),
			mouthX: gsap.quickTo(yellowMouthRef.current, "x", {
				duration: 0.2,
				ease: "power2.out",
			}),
			mouthY: gsap.quickTo(yellowMouthRef.current, "y", {
				duration: 0.2,
				ease: "power2.out",
			}),
			orangeFaceX: gsap.quickTo(orangeFaceRef.current, "x", {
				duration: 0.2,
				ease: "power2.out",
			}),
			orangeFaceY: gsap.quickTo(orangeFaceRef.current, "y", {
				duration: 0.2,
				ease: "power2.out",
			}),
			orangeSkew: gsap.quickTo(orangeRef.current, "skewX", {
				duration: 0.3,
				ease: "power2.out",
			}),
			purpleFaceLeft: gsap.quickTo(purpleFaceRef.current, "left", {
				duration: 0.3,
				ease: "power2.out",
			}),
			purpleFaceTop: gsap.quickTo(purpleFaceRef.current, "top", {
				duration: 0.3,
				ease: "power2.out",
			}),
			purpleHeight: gsap.quickTo(purpleRef.current, "height", {
				duration: 0.3,
				ease: "power2.out",
			}),
			purpleSkew: gsap.quickTo(purpleRef.current, "skewX", {
				duration: 0.3,
				ease: "power2.out",
			}),
			purpleX: gsap.quickTo(purpleRef.current, "x", {
				duration: 0.3,
				ease: "power2.out",
			}),
			yellowFaceX: gsap.quickTo(yellowFaceRef.current, "x", {
				duration: 0.2,
				ease: "power2.out",
			}),
			yellowFaceY: gsap.quickTo(yellowFaceRef.current, "y", {
				duration: 0.2,
				ease: "power2.out",
			}),
			yellowSkew: gsap.quickTo(yellowRef.current, "skewX", {
				duration: 0.3,
				ease: "power2.out",
			}),
		};
		quickToRef.current = quickTo;

		const calcPos = (element: HTMLElement) => {
			const rect = element.getBoundingClientRect();
			const centerX = rect.left + rect.width / 2;
			const centerY = rect.top + rect.height / 3;
			const deltaX = mouseRef.current.x - centerX;
			const deltaY = mouseRef.current.y - centerY;

			return {
				bodySkew: Math.max(-6, Math.min(6, -deltaX / 120)),
				faceX: Math.max(-15, Math.min(15, deltaX / 20)),
				faceY: Math.max(-10, Math.min(10, deltaY / 30)),
			};
		};

		const calcEyePos = (element: HTMLElement, maxDistance: number) => {
			const rect = element.getBoundingClientRect();
			const centerX = rect.left + rect.width / 2;
			const centerY = rect.top + rect.height / 2;
			const deltaX = mouseRef.current.x - centerX;
			const deltaY = mouseRef.current.y - centerY;
			const distance = Math.min(
				Math.sqrt(deltaX ** 2 + deltaY ** 2),
				maxDistance,
			);
			const angle = Math.atan2(deltaY, deltaX);
			return {
				x: Math.cos(angle) * distance,
				y: Math.sin(angle) * distance,
			};
		};

		const tick = () => {
			const container = containerRef.current;
			if (!container) {
				return;
			}

			const {
				isHidingPassword: hiding,
				isLooking: looking,
				isShowingPassword: showing,
				isTyping: typing,
			} = stateRef.current;

			if (purpleRef.current && !showing) {
				const purplePos = calcPos(purpleRef.current);
				if (typing || hiding) {
					quickTo.purpleSkew(purplePos.bodySkew - 12);
					quickTo.purpleX(40);
					quickTo.purpleHeight(440);
				} else {
					quickTo.purpleSkew(purplePos.bodySkew);
					quickTo.purpleX(0);
					quickTo.purpleHeight(400);
				}
			}

			if (blackRef.current && !showing) {
				const blackPos = calcPos(blackRef.current);
				if (looking) {
					quickTo.blackSkew(blackPos.bodySkew * 1.5 + 10);
					quickTo.blackX(20);
				} else if (typing || hiding) {
					quickTo.blackSkew(blackPos.bodySkew * 1.5);
					quickTo.blackX(0);
				} else {
					quickTo.blackSkew(blackPos.bodySkew);
					quickTo.blackX(0);
				}
			}

			if (orangeRef.current && !showing) {
				const orangePos = calcPos(orangeRef.current);
				quickTo.orangeSkew(orangePos.bodySkew);
			}

			if (yellowRef.current && !showing) {
				const yellowPos = calcPos(yellowRef.current);
				quickTo.yellowSkew(yellowPos.bodySkew);
			}

			if (purpleRef.current && !showing && !looking) {
				const purplePos = calcPos(purpleRef.current);
				const purpleFaceX =
					purplePos.faceX >= 0
						? Math.min(25, purplePos.faceX * 1.5)
						: purplePos.faceX;
				quickTo.purpleFaceLeft(45 + purpleFaceX);
				quickTo.purpleFaceTop(40 + purplePos.faceY);
			}

			if (blackRef.current && !showing && !looking) {
				const blackPos = calcPos(blackRef.current);
				quickTo.blackFaceLeft(26 + blackPos.faceX);
				quickTo.blackFaceTop(32 + blackPos.faceY);
			}

			if (orangeRef.current && !showing) {
				const orangePos = calcPos(orangeRef.current);
				quickTo.orangeFaceX(orangePos.faceX);
				quickTo.orangeFaceY(orangePos.faceY);
			}

			if (yellowRef.current && !showing) {
				const yellowPos = calcPos(yellowRef.current);
				quickTo.yellowFaceX(yellowPos.faceX);
				quickTo.yellowFaceY(yellowPos.faceY);
				quickTo.mouthX(yellowPos.faceX);
				quickTo.mouthY(yellowPos.faceY);
			}

			if (!showing) {
				const pupils = container.querySelectorAll(".pupil");
				for (const pupilNode of pupils) {
					const element = pupilNode as HTMLElement;
					const maxDistance = Number(element.dataset.maxDistance) || 5;
					const eyePos = calcEyePos(element, maxDistance);
					gsap.set(element, { x: eyePos.x, y: eyePos.y });
				}

				if (!looking) {
					const eyeballs = container.querySelectorAll(".eyeball");
					for (const eyeballNode of eyeballs) {
						const element = eyeballNode as HTMLElement;
						const maxDistance = Number(element.dataset.maxDistance) || 10;
						const pupil = element.querySelector(
							".eyeball-pupil",
						) as HTMLElement | null;
						if (!pupil) {
							continue;
						}
						const eyePos = calcEyePos(element, maxDistance);
						gsap.set(pupil, { x: eyePos.x, y: eyePos.y });
					}
				}
			}

			rafIdRef.current = requestAnimationFrame(tick);
		};

		const onMove = (event: MouseEvent) => {
			mouseRef.current = { x: event.clientX, y: event.clientY };
		};

		window.addEventListener("mousemove", onMove, { passive: true });
		rafIdRef.current = requestAnimationFrame(tick);

		return () => {
			window.removeEventListener("mousemove", onMove);
			cancelAnimationFrame(rafIdRef.current);
			const animatedElements = containerRef.current?.querySelectorAll("*");
			if (animatedElements) gsap.killTweensOf(animatedElements);
			quickToRef.current = null;
		};
	}, [prefersReducedMotion]);

	useEffect(() => {
		if (prefersReducedMotion) return;
		const purpleEyeballs = purpleRef.current?.querySelectorAll(".eyeball");
		if (!purpleEyeballs?.length) {
			return;
		}

		const scheduleBlink = () => {
			purpleBlinkTimerRef.current = setTimeout(
				() => {
					for (const element of purpleEyeballs) {
						gsap.to(element, { duration: 0.08, ease: "power2.in", height: 2 });
					}
					purpleBlinkResetTimerRef.current = setTimeout(() => {
						for (const element of purpleEyeballs) {
							const size =
								Number(
									(element as HTMLElement).style.width.replace("px", ""),
								) || 18;
							gsap.to(element, {
								duration: 0.08,
								ease: "power2.out",
								height: size,
							});
						}
						scheduleBlink();
					}, 150);
				},
				Math.random() * 4000 + 3000,
			);
		};

		scheduleBlink();
		return () => {
			clearTimeout(purpleBlinkTimerRef.current);
			clearTimeout(purpleBlinkResetTimerRef.current);
		};
	}, [prefersReducedMotion]);

	useEffect(() => {
		if (prefersReducedMotion) return;
		const blackEyeballs = blackRef.current?.querySelectorAll(".eyeball");
		if (!blackEyeballs?.length) {
			return;
		}

		const scheduleBlink = () => {
			blackBlinkTimerRef.current = setTimeout(
				() => {
					for (const element of blackEyeballs) {
						gsap.to(element, { duration: 0.08, ease: "power2.in", height: 2 });
					}
					blackBlinkResetTimerRef.current = setTimeout(() => {
						for (const element of blackEyeballs) {
							const size =
								Number(
									(element as HTMLElement).style.width.replace("px", ""),
								) || 16;
							gsap.to(element, {
								duration: 0.08,
								ease: "power2.out",
								height: size,
							});
						}
						scheduleBlink();
					}, 150);
				},
				Math.random() * 4000 + 3000,
			);
		};

		scheduleBlink();
		return () => {
			clearTimeout(blackBlinkTimerRef.current);
			clearTimeout(blackBlinkResetTimerRef.current);
		};
	}, [prefersReducedMotion]);

	const applyLookAtEachOther = contextSafe(() => {
		const quickTo = quickToRef.current;
		if (quickTo) {
			quickTo.purpleFaceLeft(55);
			quickTo.purpleFaceTop(65);
			quickTo.blackFaceLeft(32);
			quickTo.blackFaceTop(12);
		}

		purpleRef.current?.querySelectorAll(".eyeball-pupil").forEach((pupil) => {
			gsap.to(pupil, {
				duration: 0.3,
				ease: "power2.out",
				overwrite: "auto",
				x: 3,
				y: 4,
			});
		});
		blackRef.current?.querySelectorAll(".eyeball-pupil").forEach((pupil) => {
			gsap.to(pupil, {
				duration: 0.3,
				ease: "power2.out",
				overwrite: "auto",
				x: 0,
				y: -4,
			});
		});
	});

	const applyHidingPassword = contextSafe(() => {
		const quickTo = quickToRef.current;
		if (quickTo) {
			quickTo.purpleFaceLeft(55);
			quickTo.purpleFaceTop(65);
		}
	});

	const applyShowPassword = contextSafe(() => {
		const quickTo = quickToRef.current;
		if (quickTo) {
			quickTo.purpleSkew(0);
			quickTo.blackSkew(0);
			quickTo.orangeSkew(0);
			quickTo.yellowSkew(0);
			quickTo.purpleX(0);
			quickTo.blackX(0);
			quickTo.purpleHeight(400);
			quickTo.purpleFaceLeft(20);
			quickTo.purpleFaceTop(35);
			quickTo.blackFaceLeft(10);
			quickTo.blackFaceTop(28);
			quickTo.orangeFaceX(50 - 82);
			quickTo.orangeFaceY(85 - 90);
			quickTo.yellowFaceX(20 - 52);
			quickTo.yellowFaceY(35 - 40);
			quickTo.mouthX(10 - 40);
			quickTo.mouthY(0);
		}

		purpleRef.current?.querySelectorAll(".eyeball-pupil").forEach((pupil) => {
			gsap.to(pupil, {
				duration: 0.3,
				ease: "power2.out",
				overwrite: "auto",
				x: -4,
				y: -4,
			});
		});
		blackRef.current?.querySelectorAll(".eyeball-pupil").forEach((pupil) => {
			gsap.to(pupil, {
				duration: 0.3,
				ease: "power2.out",
				overwrite: "auto",
				x: -4,
				y: -4,
			});
		});
		orangeRef.current?.querySelectorAll(".pupil").forEach((pupil) => {
			gsap.to(pupil, {
				duration: 0.3,
				ease: "power2.out",
				overwrite: "auto",
				x: -5,
				y: -4,
			});
		});
		yellowRef.current?.querySelectorAll(".pupil").forEach((pupil) => {
			gsap.to(pupil, {
				duration: 0.3,
				ease: "power2.out",
				overwrite: "auto",
				x: -5,
				y: -4,
			});
		});
	});

	useEffect(() => {
		if (prefersReducedMotion) {
			clearTimeout(purplePeekTimerRef.current);
			clearTimeout(purplePeekResetTimerRef.current);
			return;
		}
		if (!isShowingPassword || passwordLength <= 0) {
			clearTimeout(purplePeekTimerRef.current);
			clearTimeout(purplePeekResetTimerRef.current);
			return;
		}

		const purplePupils = purpleRef.current?.querySelectorAll(".eyeball-pupil");
		if (!purplePupils?.length) {
			return;
		}

		const schedulePeek = () => {
			purplePeekTimerRef.current = setTimeout(
				() => {
					for (const pupil of purplePupils) {
						gsap.to(pupil, {
							duration: 0.3,
							ease: "power2.out",
							overwrite: "auto",
							x: 4,
							y: 5,
						});
					}

					const quickTo = quickToRef.current;
					if (quickTo) {
						quickTo.purpleFaceLeft(20);
						quickTo.purpleFaceTop(35);
					}

					purplePeekResetTimerRef.current = setTimeout(() => {
						for (const pupil of purplePupils) {
							gsap.to(pupil, {
								duration: 0.3,
								ease: "power2.out",
								overwrite: "auto",
								x: -4,
								y: -4,
							});
						}
						schedulePeek();
					}, 800);
				},
				Math.random() * 3000 + 2000,
			);
		};

		schedulePeek();
		return () => {
			clearTimeout(purplePeekTimerRef.current);
			clearTimeout(purplePeekResetTimerRef.current);
		};
	}, [isShowingPassword, passwordLength, prefersReducedMotion]);

	useEffect(() => {
		if (prefersReducedMotion) return;
		if (isTyping && !isShowingPassword) {
			isLookingRef.current = true;
			stateRef.current.isLooking = true;
			applyLookAtEachOther();

			clearTimeout(lookingTimerRef.current);
			lookingTimerRef.current = setTimeout(() => {
				isLookingRef.current = false;
				stateRef.current.isLooking = false;
				purpleRef.current
					?.querySelectorAll(".eyeball-pupil")
					.forEach((pupil) => {
						gsap.killTweensOf(pupil);
					});
			}, 800);
		} else {
			clearTimeout(lookingTimerRef.current);
			isLookingRef.current = false;
			stateRef.current.isLooking = false;
		}

		return () => clearTimeout(lookingTimerRef.current);
	}, [applyLookAtEachOther, isShowingPassword, isTyping, prefersReducedMotion]);

	useEffect(() => {
		if (prefersReducedMotion) return;
		if (isShowingPassword) {
			applyShowPassword();
		} else if (isHidingPassword) {
			applyHidingPassword();
		}
	}, [
		applyHidingPassword,
		applyShowPassword,
		isHidingPassword,
		isShowingPassword,
		prefersReducedMotion,
	]);

	return (
		<div
			className="relative mx-auto h-[320px] w-[440px] max-w-full lg:h-[400px] lg:w-[550px]"
			ref={containerRef}
		>
			<div
				className="absolute bottom-0 left-[70px] z-[1] rounded-t-[10px]"
				ref={purpleRef}
				style={{
					backgroundColor: "#6C3FF5",
					borderRadius: "10px 10px 0 0",
					height: 400,
					transformOrigin: "bottom center",
					width: 180,
					willChange: "transform",
				}}
			>
				<div
					className="absolute flex gap-8"
					ref={purpleFaceRef}
					style={{ left: 45, top: 40 }}
				>
					<EyeBall
						maxDistance={5}
						pupilColor="#2D2D2D"
						pupilSize={7}
						size={18}
					/>
					<EyeBall
						maxDistance={5}
						pupilColor="#2D2D2D"
						pupilSize={7}
						size={18}
					/>
				</div>
			</div>

			<div
				className="absolute bottom-0 left-[240px] z-[2] rounded-t-[8px]"
				ref={blackRef}
				style={{
					backgroundColor: "#2D2D2D",
					borderRadius: "8px 8px 0 0",
					height: 310,
					transformOrigin: "bottom center",
					width: 120,
					willChange: "transform",
				}}
			>
				<div
					className="absolute flex gap-6"
					ref={blackFaceRef}
					style={{ left: 26, top: 32 }}
				>
					<EyeBall
						maxDistance={4}
						pupilColor="#2D2D2D"
						pupilSize={6}
						size={16}
					/>
					<EyeBall
						maxDistance={4}
						pupilColor="#2D2D2D"
						pupilSize={6}
						size={16}
					/>
				</div>
			</div>

			<div
				className="absolute bottom-0 left-0 z-[3]"
				ref={orangeRef}
				style={{
					backgroundColor: "#FF9B6B",
					borderRadius: "120px 120px 0 0",
					height: 200,
					transformOrigin: "bottom center",
					width: 240,
					willChange: "transform",
				}}
			>
				<div
					className="absolute flex gap-8"
					ref={orangeFaceRef}
					style={{ left: 82, top: 90 }}
				>
					<Pupil maxDistance={5} pupilColor="#2D2D2D" size={12} />
					<Pupil maxDistance={5} pupilColor="#2D2D2D" size={12} />
				</div>
			</div>

			<div
				className="absolute bottom-0 left-[310px] z-[4]"
				ref={yellowRef}
				style={{
					backgroundColor: "#E8D754",
					borderRadius: "70px 70px 0 0",
					height: 230,
					transformOrigin: "bottom center",
					width: 140,
					willChange: "transform",
				}}
			>
				<div
					className="absolute flex gap-6"
					ref={yellowFaceRef}
					style={{ left: 52, top: 40 }}
				>
					<Pupil maxDistance={5} pupilColor="#2D2D2D" size={12} />
					<Pupil maxDistance={5} pupilColor="#2D2D2D" size={12} />
				</div>
				<div
					className="absolute rounded-full"
					ref={yellowMouthRef}
					style={{
						backgroundColor: "#2D2D2D",
						height: 4,
						left: 40,
						top: 88,
						width: 80,
					}}
				/>
			</div>
		</div>
	);
}

function usePrefersReducedMotion() {
	const [reduced, setReduced] = useState(
		() =>
			typeof window !== "undefined" &&
			window.matchMedia("(prefers-reduced-motion: reduce)").matches,
	);

	useEffect(() => {
		const media = window.matchMedia("(prefers-reduced-motion: reduce)");
		const update = () => setReduced(media.matches);
		media.addEventListener("change", update);
		return () => media.removeEventListener("change", update);
	}, []);

	return reduced;
}
