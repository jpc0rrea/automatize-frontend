"use client";

import { LayoutGrid } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import type { User } from "next-auth";
import { SidebarUserNav } from "@/components/sidebar-user-nav";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";
import { cn } from "@/lib/utils";

export function AppSidebar({ user }: { user: User | undefined }) {
  const router = useRouter();
  const pathname = usePathname();
  const { setOpenMobile } = useSidebar();

  const isPostsSection = pathname === "/" || pathname?.startsWith("/posts");

  return (
    <Sidebar className="group-data-[side=left]:border-r-0">
      <SidebarHeader>
        <SidebarMenu>
          <div className="flex flex-row items-center justify-between">
            <Link
              className="flex flex-row items-center rounded-md hover:bg-muted transition-colors p-2"
              href="/"
              onClick={() => {
                setOpenMobile(false);
              }}
            >
              {/* Logo for light mode */}
              {/* biome-ignore lint/a11y/useAltText: Alt text provided */}
              <img
                alt="AutomatizeJá"
                className="block dark:hidden"
                src="/logo/3.png"
                style={{ height: 28, width: "auto" }}
              />
              {/* Logo for dark mode */}
              {/* biome-ignore lint/a11y/useAltText: Alt text provided */}
              <img
                alt="AutomatizeJá"
                className="hidden dark:block"
                src="/logo/9.png"
                style={{ height: 28, width: "auto" }}
              />
            </Link>
          </div>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        {/* Navigation Section */}
        <SidebarGroup>
          <SidebarGroupLabel>Navegação</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton
                  asChild
                  className={cn(isPostsSection && "bg-primary/10 text-primary")}
                >
                  <Link
                    href="/"
                    onClick={() => setOpenMobile(false)}
                  >
                    <LayoutGrid className="size-4" />
                    <span>Meus Posts</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter>{user && <SidebarUserNav user={user} />}</SidebarFooter>
    </Sidebar>
  );
}
