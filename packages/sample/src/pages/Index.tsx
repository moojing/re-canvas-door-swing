import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { doorEntrancePresets } from "retro-horror-door";
import { Link } from "react-router-dom";

const htmlSnippet = `<div id="door-root"></div>
<script type="module">
  import { mountDoorEntrance } from 'retro-horror-door';

  mountDoorEntrance({
    target: document.getElementById('door-root'),
    preset: 'single-lever-wood',
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
      <div className="mx-auto flex w-full max-w-none flex-col gap-10 px-4 py-8 sm:px-6">
        <header className="space-y-4">
          <Badge variant="outline" className="border-emerald-500/60 text-emerald-200">
            vanilla module ready
          </Badge>
          <h1 className="text-3xl font-bold sm:text-4xl">
            門入場動畫 Library
          </h1>
          <p className="max-w-3xl text-lg text-white/70">
            門動畫以可播放 preset 封裝，並透過 vanilla mount helper
            掛載到任意 DOM 節點。
          </p>
          <div className="flex flex-wrap gap-2 text-sm text-white/60">
            {doorEntrancePresets.map((preset) => (
              <span
                key={preset.id}
                className="rounded-full border border-white/10 px-3 py-1"
              >
                {preset.id}
              </span>
            ))}
          </div>
        </header>

        <section className="space-y-4">
          <div className="space-y-2">
            <h2 className="text-2xl font-semibold">Door PoCs</h2>
            <p className="max-w-3xl text-sm text-white/65">
              針對原本被判不可做或高風險的門型，做最小可驗證原型。
            </p>
          </div>

          <div className="grid gap-6 md:grid-cols-2">
            <Card className="border-white/10 bg-white/[0.04] shadow-lg shadow-black/30">
              <CardHeader className="space-y-2">
                <Badge variant="outline" className="w-fit border-amber-500/60 text-amber-200">
                  1-2 a04
                </Badge>
                <CardTitle className="text-lg">單門-粗把手</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-sm text-white/70">
                  共用單門骨架切換 s1 柵欄鐵門 / s2 目字鐵門，驗證兩者都可用低複雜度幾何成立。
                </p>
                <Button asChild variant="secondary" size="sm">
                  <Link to="/poc/a04">開啟 POC</Link>
                </Button>
              </CardContent>
            </Card>

            <Card className="border-white/10 bg-white/[0.04] shadow-lg shadow-black/30">
              <CardHeader className="space-y-2">
                <Badge variant="outline" className="w-fit border-amber-500/60 text-amber-200">
                  1-2 a11
                </Badge>
                <CardTitle className="text-lg">重型水門</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-sm text-white/70">
                  Primitive 疊加 + 程序材質，驗證浮凸水門不需外找模型。
                </p>
                <Button asChild variant="secondary" size="sm">
                  <Link to="/poc/a11">開啟 POC</Link>
                </Button>
              </CardContent>
            </Card>

            <Card className="border-white/10 bg-white/[0.04] shadow-lg shadow-black/30">
              <CardHeader className="space-y-2">
                <Badge variant="outline" className="w-fit border-amber-500/60 text-amber-200">
                  1-2 b10
                </Badge>
                <CardTitle className="text-lg">下水道閘門</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-sm text-white/70">
                  Shape 輪廓擠出 + 上下對開，驗證齒形閘門可用程式幾何製作。
                </p>
                <Button asChild variant="secondary" size="sm">
                  <Link to="/poc/b10">開啟 POC</Link>
                </Button>
              </CardContent>
            </Card>
          </div>
        </section>

        <div className="max-w-3xl">
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
                使用 `mountDoorEntrance` 將 vanilla renderer 掛在任意 DOM 節點。Sample 頁面在
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
