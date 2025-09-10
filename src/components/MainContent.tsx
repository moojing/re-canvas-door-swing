import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

const MainContent = () => {
  return (
    <div className="min-h-screen bg-background p-8">
      <div className="max-w-4xl mx-auto space-y-8">
        {/* Header */}
        <header className="text-center space-y-4">
          <h1 className="text-4xl font-bold text-foreground">歡迎來到主頁面</h1>
          <p className="text-xl text-muted-foreground">
            這裡是門開啟後的內容區域
          </p>
        </header>

        {/* Main content cards */}
        <div className="grid md:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle>功能介紹</CardTitle>
              <CardDescription>
                探索我們的核心功能和服務
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground mb-4">
                Lorem ipsum dolor sit amet, consectetur adipiscing elit. 
                Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.
              </p>
              <Button variant="outline">了解更多</Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>最新消息</CardTitle>
              <CardDescription>
                查看最新的更新和公告
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground mb-4">
                Ut enim ad minim veniam, quis nostrud exercitation ullamco 
                laboris nisi ut aliquip ex ea commodo consequat.
              </p>
              <Button variant="secondary">查看全部</Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>用戶指南</CardTitle>
              <CardDescription>
                快速入門和使用技巧
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground mb-4">
                Duis aute irure dolor in reprehenderit in voluptate velit 
                esse cillum dolore eu fugiat nulla pariatur.
              </p>
              <Button>開始使用</Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>聯絡我們</CardTitle>
              <CardDescription>
                有問題？我們很樂意為您提供協助
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground mb-4">
                Excepteur sint occaecat cupidatat non proident, sunt in 
                culpa qui officia deserunt mollit anim id est laborum.
              </p>
              <Button variant="outline">聯絡支援</Button>
            </CardContent>
          </Card>
        </div>

        {/* Call to action */}
        <div className="text-center space-y-4 py-8">
          <h2 className="text-2xl font-semibold text-foreground">
            準備好開始了嗎？
          </h2>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            加入我們的平台，體驗全新的數位服務。簡單、快速、安全。
          </p>
          <div className="flex gap-4 justify-center">
            <Button size="lg">立即註冊</Button>
            <Button variant="outline" size="lg">了解更多</Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MainContent;