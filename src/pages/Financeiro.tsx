import { useState } from "react"
import { DollarSign, TrendingUp, TrendingDown, Calendar, Download } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"

interface Transaction {
  id: string
  description: string
  type: 'income' | 'expense'
  amount: number
  date: string
  category: string
  status: 'completed' | 'pending' | 'cancelled'
}

const mockTransactions: Transaction[] = [
  {
    id: '1',
    description: 'Pagamento Cliente ABC Corp',
    type: 'income',
    amount: 45000,
    date: '2024-01-15',
    category: 'Serviços',
    status: 'completed'
  },
  {
    id: '2',
    description: 'Folha de Pagamento - Janeiro',
    type: 'expense',
    amount: 156800,
    date: '2024-01-05',
    category: 'Pessoal',
    status: 'completed'
  },
  {
    id: '3',
    description: 'Compra Equipamentos TI',
    type: 'expense',
    amount: 25000,
    date: '2024-01-10',
    category: 'Tecnologia',
    status: 'pending'
  },
  {
    id: '4',
    description: 'Aluguel Escritório',
    type: 'expense',
    amount: 8500,
    date: '2024-01-01',
    category: 'Operacional',
    status: 'completed'
  }
]

const getTransactionBadge = (type: Transaction['type']) => {
  return type === 'income' 
    ? <Badge variant="default" className="bg-success text-success-foreground">Receita</Badge>
    : <Badge variant="destructive">Despesa</Badge>
}

const getStatusBadge = (status: Transaction['status']) => {
  switch (status) {
    case 'completed':
      return <Badge variant="default" className="bg-success text-success-foreground">Concluído</Badge>
    case 'pending':
      return <Badge variant="secondary" className="bg-warning text-warning-foreground">Pendente</Badge>
    case 'cancelled':
      return <Badge variant="destructive">Cancelado</Badge>
    default:
      return <Badge variant="secondary">-</Badge>
  }
}

export default function Financeiro() {
  const [transactions] = useState<Transaction[]>(mockTransactions)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Gestão Financeira</h1>
          <p className="text-muted-foreground">Acompanhe receitas, despesas e fluxo de caixa</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="default">
            <Calendar className="h-4 w-4 mr-2" />
            Período
          </Button>
          <Button className="bg-primary hover:bg-primary-hover">
            <Download className="h-4 w-4 mr-2" />
            Relatório
          </Button>
        </div>
      </div>

      {/* Financial Overview */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <TrendingUp className="h-8 w-8 text-success" />
              <div>
                <div className="text-2xl font-bold text-success">R$ 284.500</div>
                <p className="text-sm text-muted-foreground">Receitas do Mês</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <TrendingDown className="h-8 w-8 text-destructive" />
              <div>
                <div className="text-2xl font-bold text-destructive">R$ 198.300</div>
                <p className="text-sm text-muted-foreground">Despesas do Mês</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <DollarSign className="h-8 w-8 text-primary" />
              <div>
                <div className="text-2xl font-bold text-foreground">R$ 86.200</div>
                <p className="text-sm text-muted-foreground">Lucro Líquido</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-foreground">30.3%</div>
            <p className="text-sm text-muted-foreground">Margem de Lucro</p>
            <div className="flex items-center mt-2">
              <TrendingUp className="h-4 w-4 text-success mr-1" />
              <span className="text-xs text-success">+5.2% vs mês anterior</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Detailed Analysis */}
      <Tabs defaultValue="transactions" className="space-y-4">
        <TabsList>
          <TabsTrigger value="transactions">Transações</TabsTrigger>
          <TabsTrigger value="analytics">Análise</TabsTrigger>
          <TabsTrigger value="reports">Relatórios</TabsTrigger>
        </TabsList>

        <TabsContent value="transactions" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Transações Recentes</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Descrição</TableHead>
                      <TableHead>Tipo</TableHead>
                      <TableHead>Categoria</TableHead>
                      <TableHead>Data</TableHead>
                      <TableHead>Valor</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {transactions.map((transaction) => (
                      <TableRow key={transaction.id}>
                        <TableCell className="font-medium">{transaction.description}</TableCell>
                        <TableCell>{getTransactionBadge(transaction.type)}</TableCell>
                        <TableCell>{transaction.category}</TableCell>
                        <TableCell>{new Date(transaction.date).toLocaleDateString('pt-BR')}</TableCell>
                        <TableCell className={transaction.type === 'income' ? 'text-success font-semibold' : 'text-destructive font-semibold'}>
                          {transaction.type === 'income' ? '+' : '-'} R$ {transaction.amount.toLocaleString('pt-BR')}
                        </TableCell>
                        <TableCell>{getStatusBadge(transaction.status)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="analytics" className="space-y-4">
          <div className="grid gap-6 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Distribuição de Receitas</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-sm">Serviços de Telefonia</span>
                    <span className="font-semibold">65%</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm">Internet Empresarial</span>
                    <span className="font-semibold">25%</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm">Armazenamento de Dados</span>
                    <span className="font-semibold">10%</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Distribuição de Despesas</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-sm">Folha de Pagamento</span>
                    <span className="font-semibold">55%</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm">Infraestrutura</span>
                    <span className="font-semibold">20%</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm">Operacional</span>
                    <span className="font-semibold">15%</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm">Marketing</span>
                    <span className="font-semibold">10%</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="reports" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-3">
            <Card className="cursor-pointer hover:shadow-md transition-shadow">
              <CardContent className="p-6 text-center">
                <DollarSign className="h-12 w-12 text-primary mx-auto mb-4" />
                <h3 className="font-semibold mb-2">Demonstrativo de Resultados</h3>
                <p className="text-sm text-muted-foreground">Relatório completo de receitas e despesas</p>
              </CardContent>
            </Card>
            <Card className="cursor-pointer hover:shadow-md transition-shadow">
              <CardContent className="p-6 text-center">
                <TrendingUp className="h-12 w-12 text-success mx-auto mb-4" />
                <h3 className="font-semibold mb-2">Fluxo de Caixa</h3>
                <p className="text-sm text-muted-foreground">Análise detalhada do fluxo financeiro</p>
              </CardContent>
            </Card>
            <Card className="cursor-pointer hover:shadow-md transition-shadow">
              <CardContent className="p-6 text-center">
                <Calendar className="h-12 w-12 text-secondary mx-auto mb-4" />
                <h3 className="font-semibold mb-2">Balanço Patrimonial</h3>
                <p className="text-sm text-muted-foreground">Posição financeira da empresa</p>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}