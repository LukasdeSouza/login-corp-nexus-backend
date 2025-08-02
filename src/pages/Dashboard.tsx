import { 
  Users, 
  Truck, 
  DollarSign, 
  FileText,
  TrendingUp,
  TrendingDown
} from "lucide-react"
import { StatCard } from "@/components/dashboard/StatCard"
import { RecentActivity } from "@/components/dashboard/RecentActivity"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

export default function Dashboard() {
  return (
    <div className="space-y-6">
      {/* Welcome Section */}
      <div className="bg-gradient-to-r from-primary to-primary-hover rounded-lg p-6 text-primary-foreground">
        <h1 className="text-2xl font-bold mb-2">Bem-vindo ao Sistema Login</h1>
        <p className="text-primary-foreground/90">
          Gerencie sua empresa com eficiência e segurança
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Total de Funcionários"
          value="147"
          description="Funcionários ativos"
          icon={Users}
          trend={{ value: 8.2, isPositive: true }}
        />
        <StatCard
          title="Fornecedores Ativos"
          value="23"
          description="Fornecedores cadastrados"
          icon={Truck}
          trend={{ value: 3.1, isPositive: true }}
        />
        <StatCard
          title="Receita Mensal"
          value="R$ 284.500"
          description="Dezembro 2024"
          icon={DollarSign}
          trend={{ value: 12.5, isPositive: true }}
        />
        <StatCard
          title="Folha de Pagamento"
          value="R$ 156.800"
          description="Dezembro 2024"
          icon={FileText}
          trend={{ value: -2.1, isPositive: false }}
        />
      </div>

      {/* Main Content Grid */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Financial Overview */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-success" />
              Visão Financeira
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Receitas</span>
                  <span className="font-semibold text-success">R$ 284.500</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Despesas</span>
                  <span className="font-semibold text-destructive">R$ 198.300</span>
                </div>
                <div className="flex justify-between items-center border-t pt-3">
                  <span className="text-sm font-medium">Lucro Líquido</span>
                  <span className="font-bold text-success">R$ 86.200</span>
                </div>
              </div>
              
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Margem de Lucro</span>
                  <span className="font-semibold">30.3%</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">ROI</span>
                  <span className="font-semibold text-success">+18.4%</span>
                </div>
                <div className="flex justify-between items-center border-t pt-3">
                  <span className="text-sm font-medium">Fluxo de Caixa</span>
                  <span className="font-bold text-success">R$ 124.800</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Recent Activity */}
        <RecentActivity />
      </div>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Ações Rápidas</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-4">
            <button className="flex flex-col items-center gap-2 p-4 rounded-lg border border-border hover:bg-accent transition-colors">
              <Users className="h-8 w-8 text-primary" />
              <span className="text-sm font-medium">Adicionar Funcionário</span>
            </button>
            <button className="flex flex-col items-center gap-2 p-4 rounded-lg border border-border hover:bg-accent transition-colors">
              <Truck className="h-8 w-8 text-primary" />
              <span className="text-sm font-medium">Novo Fornecedor</span>
            </button>
            <button className="flex flex-col items-center gap-2 p-4 rounded-lg border border-border hover:bg-accent transition-colors">
              <FileText className="h-8 w-8 text-primary" />
              <span className="text-sm font-medium">Processar Folha</span>
            </button>
            <button className="flex flex-col items-center gap-2 p-4 rounded-lg border border-border hover:bg-accent transition-colors">
              <DollarSign className="h-8 w-8 text-primary" />
              <span className="text-sm font-medium">Relatório Financeiro</span>
            </button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}