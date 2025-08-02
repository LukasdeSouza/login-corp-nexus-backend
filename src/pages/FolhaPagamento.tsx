import { useState } from "react"
import { FileText, Calendar, Download, Play, CheckCircle, AlertCircle } from "lucide-react"
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

interface PayrollEntry {
  id: string
  employeeName: string
  employeeId: string
  department: string
  baseSalary: number
  benefits: number
  deductions: number
  netSalary: number
  status: 'pending' | 'processed' | 'paid'
}

interface PayrollPeriod {
  id: string
  period: string
  status: 'draft' | 'processing' | 'completed'
  totalEmployees: number
  totalAmount: number
  processedDate?: string
}

const mockPayrollEntries: PayrollEntry[] = [
  {
    id: '1',
    employeeName: 'João Silva',
    employeeId: 'EMP001',
    department: 'Tecnologia',
    baseSalary: 8500,
    benefits: 1200,
    deductions: 2850,
    netSalary: 6850,
    status: 'processed'
  },
  {
    id: '2',
    employeeName: 'Maria Santos',
    employeeId: 'EMP002',
    department: 'RH',
    baseSalary: 5200,
    benefits: 800,
    deductions: 1560,
    netSalary: 4440,
    status: 'processed'
  },
  {
    id: '3',
    employeeName: 'Pedro Costa',
    employeeId: 'EMP003',
    department: 'Vendas',
    baseSalary: 4800,
    benefits: 600,
    deductions: 1440,
    netSalary: 3960,
    status: 'pending'
  }
]

const mockPayrollPeriods: PayrollPeriod[] = [
  {
    id: '1',
    period: 'Janeiro 2024',
    status: 'completed',
    totalEmployees: 147,
    totalAmount: 656800,
    processedDate: '2024-01-05'
  },
  {
    id: '2',
    period: 'Dezembro 2023',
    status: 'completed',
    totalEmployees: 145,
    totalAmount: 642300,
    processedDate: '2023-12-05'
  },
  {
    id: '3',
    period: 'Fevereiro 2024',
    status: 'draft',
    totalEmployees: 149,
    totalAmount: 668200
  }
]

const getStatusBadge = (status: PayrollEntry['status']) => {
  switch (status) {
    case 'paid':
      return <Badge variant="default" className="bg-success text-success-foreground">Pago</Badge>
    case 'processed':
      return <Badge variant="secondary" className="bg-warning text-warning-foreground">Processado</Badge>
    case 'pending':
      return <Badge variant="destructive">Pendente</Badge>
    default:
      return <Badge variant="secondary">-</Badge>
  }
}

const getPeriodStatusBadge = (status: PayrollPeriod['status']) => {
  switch (status) {
    case 'completed':
      return <Badge variant="default" className="bg-success text-success-foreground">Concluído</Badge>
    case 'processing':
      return <Badge variant="secondary" className="bg-warning text-warning-foreground">Processando</Badge>
    case 'draft':
      return <Badge variant="outline">Rascunho</Badge>
    default:
      return <Badge variant="secondary">-</Badge>
  }
}

export default function FolhaPagamento() {
  const [payrollEntries] = useState<PayrollEntry[]>(mockPayrollEntries)
  const [payrollPeriods] = useState<PayrollPeriod[]>(mockPayrollPeriods)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Folha de Pagamento</h1>
          <p className="text-muted-foreground">Gerencie salários e benefícios dos funcionários</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="default">
            <Calendar className="h-4 w-4 mr-2" />
            Novo Período
          </Button>
          <Button className="bg-primary hover:bg-primary-hover">
            <Play className="h-4 w-4 mr-2" />
            Processar Folha
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <FileText className="h-8 w-8 text-primary" />
              <div>
                <div className="text-2xl font-bold text-foreground">147</div>
                <p className="text-sm text-muted-foreground">Funcionários Ativos</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-foreground">R$ 668.200</div>
            <p className="text-sm text-muted-foreground">Folha Atual (Fev/24)</p>
            <div className="flex items-center mt-2">
              <AlertCircle className="h-4 w-4 text-warning mr-1" />
              <span className="text-xs text-warning">Não processada</span>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-success">R$ 656.800</div>
            <p className="text-sm text-muted-foreground">Última Folha (Jan/24)</p>
            <div className="flex items-center mt-2">
              <CheckCircle className="h-4 w-4 text-success mr-1" />
              <span className="text-xs text-success">Processada</span>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-foreground">R$ 4.544</div>
            <p className="text-sm text-muted-foreground">Salário Médio</p>
            <div className="flex items-center mt-2">
              <span className="text-xs text-muted-foreground">Base: R$ 4.489</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content */}
      <Tabs defaultValue="current" className="space-y-4">
        <TabsList>
          <TabsTrigger value="current">Folha Atual</TabsTrigger>
          <TabsTrigger value="history">Histórico</TabsTrigger>
          <TabsTrigger value="reports">Relatórios</TabsTrigger>
        </TabsList>

        <TabsContent value="current" className="space-y-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Folha de Pagamento - Fevereiro 2024</CardTitle>
              <div className="flex gap-2">
                <Button variant="outline" size="sm">
                  <Download className="h-4 w-4 mr-2" />
                  Exportar
                </Button>
                <Button size="sm" className="bg-success hover:bg-success/90">
                  <CheckCircle className="h-4 w-4 mr-2" />
                  Aprovar Folha
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Funcionário</TableHead>
                      <TableHead>ID</TableHead>
                      <TableHead>Departamento</TableHead>
                      <TableHead>Salário Base</TableHead>
                      <TableHead>Benefícios</TableHead>
                      <TableHead>Descontos</TableHead>
                      <TableHead>Salário Líquido</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {payrollEntries.map((entry) => (
                      <TableRow key={entry.id}>
                        <TableCell className="font-medium">{entry.employeeName}</TableCell>
                        <TableCell className="text-muted-foreground">{entry.employeeId}</TableCell>
                        <TableCell>{entry.department}</TableCell>
                        <TableCell>R$ {entry.baseSalary.toLocaleString('pt-BR')}</TableCell>
                        <TableCell className="text-success">+R$ {entry.benefits.toLocaleString('pt-BR')}</TableCell>
                        <TableCell className="text-destructive">-R$ {entry.deductions.toLocaleString('pt-BR')}</TableCell>
                        <TableCell className="font-semibold">R$ {entry.netSalary.toLocaleString('pt-BR')}</TableCell>
                        <TableCell>{getStatusBadge(entry.status)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="history" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Histórico de Folhas de Pagamento</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Período</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Funcionários</TableHead>
                      <TableHead>Valor Total</TableHead>
                      <TableHead>Data Processamento</TableHead>
                      <TableHead>Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {payrollPeriods.map((period) => (
                      <TableRow key={period.id}>
                        <TableCell className="font-medium">{period.period}</TableCell>
                        <TableCell>{getPeriodStatusBadge(period.status)}</TableCell>
                        <TableCell>{period.totalEmployees}</TableCell>
                        <TableCell>R$ {period.totalAmount.toLocaleString('pt-BR')}</TableCell>
                        <TableCell>
                          {period.processedDate 
                            ? new Date(period.processedDate).toLocaleDateString('pt-BR')
                            : '-'
                          }
                        </TableCell>
                        <TableCell>
                          <Button variant="outline" size="sm">
                            <Download className="h-4 w-4 mr-2" />
                            Baixar
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="reports" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-3">
            <Card className="cursor-pointer hover:shadow-md transition-shadow">
              <CardContent className="p-6 text-center">
                <FileText className="h-12 w-12 text-primary mx-auto mb-4" />
                <h3 className="font-semibold mb-2">Resumo da Folha</h3>
                <p className="text-sm text-muted-foreground">Relatório resumido por período</p>
              </CardContent>
            </Card>
            <Card className="cursor-pointer hover:shadow-md transition-shadow">
              <CardContent className="p-6 text-center">
                <CheckCircle className="h-12 w-12 text-success mx-auto mb-4" />
                <h3 className="font-semibold mb-2">Comprovantes de Pagamento</h3>
                <p className="text-sm text-muted-foreground">Holerites dos funcionários</p>
              </CardContent>
            </Card>
            <Card className="cursor-pointer hover:shadow-md transition-shadow">
              <CardContent className="p-6 text-center">
                <Calendar className="h-12 w-12 text-secondary mx-auto mb-4" />
                <h3 className="font-semibold mb-2">Relatório Anual</h3>
                <p className="text-sm text-muted-foreground">Consolidado anual da folha</p>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}