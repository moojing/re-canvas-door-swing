import ReactSample from "@/sample/ReactSample";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { doorAnimationConfigs } from "door-entrance";

const reactSnippet = `import { DoorEntrance } from 'door-entrance';

export const LandingGate = () => (
  <DoorEntrance
    variant="top-down-entry"
    onComplete={() => console.log('done')}
  />
);`;

const htmlSnippet = `<div id="door-root"></div>
<script type="module">
  import { mountDoorEntrance } from 'door-entrance/vanilla';

  mountDoorEntrance({
    target: document.getElementById('door-root'),
    variant: 'direct-entry',
    autoPlay: true,
  });
</script>`;

const CodeBlock = ({ code }: { code: string }) => (
  <pre className="overflow-auto rounded-xl border border-white/10 bg-black/60 p-4 text-sm leading-relaxed text-emerald-100 shadow-inner shadow-black/40">
    <code>{code}</code>
  </pre>
);

const Index = () => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-black to-slate-900 text-white">
      <div className="mx-auto flex max-w-6xl flex-col gap-10 px-6 py-12">
        <header className="space-y-4">
          <Badge variant="outline" className="border-emerald-500/60 text-emerald-200">
            module + samples ready
          </Badge>
          <h1 className="text-3xl font-bold sm:text-4xl">
            門入場動畫 Library
          </h1>
          <p className="max-w-3xl text-lg text-white/70">
            兩款動畫都抽成 module：direct-entry（正面開門推進）與
            top-down-entry（俯視降落後開門）。React 可直接引用元件，純 HTML 可透過 mount helper 動態掛載。
          </p>
          <div className="flex flex-wrap gap-2 text-sm text-white/60">
            {doorAnimationConfigs.map((config) => (
              <span
                key={config.id}
                className="rounded-full border border-white/10 px-3 py-1"
              >
                {config.id}
              </span>
            ))}
          </div>
        </header>

        <ReactSample />

        <div className="grid gap-6 md:grid-cols-2">
          <Card className="border-white/10 bg-white/[0.04] shadow-lg shadow-black/30">
            <CardHeader>
              <CardTitle className="text-lg">React 引入</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-white/70">
                導入 `DoorEntrance`，指定 variant（direct-entry / top-down-entry）。`onComplete` 會在動畫結束後觸發。
              </p>
              <CodeBlock code={reactSnippet} />
            </CardContent>
          </Card>

          <Card className="border-white/10 bg-white/[0.04] shadow-lg shadow-black/30">
            <CardHeader className="flex items-center justify-between gap-3">
              <CardTitle className="text-lg">HTML 引入</CardTitle>
              <Button asChild variant="secondary" size="sm">
                <a href="/samples/vanilla.html" target="_blank" rel="noreferrer">
                  開啟 sample
                </a>
              </Button>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-white/70">
                使用 `mountDoorEntrance` 將 React 元件掛在任意 DOM 節點。Sample 頁面在
                <code className="mx-1 rounded bg-white/10 px-1 py-0.5 text-xs">public/samples/vanilla.html</code>，啟動 `npm run dev` 後可直接開啟。
              </p>
              <CodeBlock code={htmlSnippet} />
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default Index;
