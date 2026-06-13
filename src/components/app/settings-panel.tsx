"use client";

import * as React from "react";
import { useTheme } from "next-themes";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/components/ui/toast";

function Row({ title, desc, control }: { title: string; desc: string; control: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-4 py-4">
      <div>
        <p className="text-sm font-medium">{title}</p>
        <p className="text-sm text-muted-foreground">{desc}</p>
      </div>
      {control}
    </div>
  );
}

export function SettingsPanel() {
  const { theme, setTheme } = useTheme();
  const { toast } = useToast();
  const [mounted, setMounted] = React.useState(false);
  // Hydration guard: theme value is client-only (next-themes).
  // eslint-disable-next-line react-hooks/set-state-in-effect
  React.useEffect(() => setMounted(true), []);

  return (
    <Tabs defaultValue="account">
      <TabsList>
        <TabsTrigger value="account">Account</TabsTrigger>
        <TabsTrigger value="notifications">Notifications</TabsTrigger>
        <TabsTrigger value="appearance">Appearance</TabsTrigger>
      </TabsList>

      <TabsContent value="account">
        <Card className="p-6">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="grid gap-1.5">
              <Label htmlFor="set-name">Full name</Label>
              <Input id="set-name" defaultValue="Shubham Datarkar" />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="set-email">Email</Label>
              <Input id="set-email" type="email" defaultValue="hello@shubhamdatarkar.com" />
            </div>
          </div>
          <Separator className="my-5" />
          <Button onClick={() => toast({ title: "Saved", description: "Account details updated.", variant: "success" })}>
            Save changes
          </Button>
        </Card>
      </TabsContent>

      <TabsContent value="notifications">
        <Card className="divide-y divide-border p-6">
          <Row title="Product updates" desc="News about new tools and features." control={<Switch defaultChecked />} />
          <Row title="Newsletter" desc="The Tuesday email — one signal, no noise." control={<Switch defaultChecked />} />
          <Row title="Reply notifications" desc="Email me when someone replies." control={<Switch />} />
        </Card>
      </TabsContent>

      <TabsContent value="appearance">
        <Card className="divide-y divide-border p-6">
          <Row
            title="Theme"
            desc="Light, dark, or match your system."
            control={
              mounted ? (
                <div className="w-40">
                  <Select value={theme} onValueChange={setTheme}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="light">Light</SelectItem>
                      <SelectItem value="dark">Dark</SelectItem>
                      <SelectItem value="system">System</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              ) : (
                <div className="h-10 w-40" />
              )
            }
          />
          <Row title="Reduce motion" desc="Honour the OS preference for less animation." control={<Switch defaultChecked />} />
        </Card>
      </TabsContent>
    </Tabs>
  );
}
