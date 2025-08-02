import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"

interface Activity {
  id: string
  type: 'payment' | 'employee' | 'supplier' | 'finance'
  description: string
  timestamp: string
  status: 'success' | 'pending' | 'warning'
}

const mockActivities: Activity[] = [
  {
    id: '1',
    type: 'payment',
    description: 'Folha de pagamento processada para Dezembro/2024',
    timestamp: '2 horas atrás',
    status: 'success'
  },
  {
    id: '2',
    type: 'supplier',
    description: 'Novo fornecedor cadastrado: TechSolutions LTDA',
    timestamp: '5 horas atrás',
    status: 'success'
  },
  {
    id: '3',
    type: 'employee',
    description: 'Funcionário João Silva - Alteração salarial',
    timestamp: '1 dia atrás',
    status: 'pending'
  },
  {
    id: '4',
    type: 'finance',
    description: 'Relatório financeiro mensal gerado',
    timestamp: '2 dias atrás',
    status: 'success'
  }
]

const getStatusBadge = (status: Activity['status']) => {
  switch (status) {
    case 'success':
      return <Badge variant="default" className="bg-success text-success-foreground">Concluído</Badge>
    case 'pending':
      return <Badge variant="secondary" className="bg-warning text-warning-foreground">Pendente</Badge>
    case 'warning':
      return <Badge variant="destructive">Atenção</Badge>
    default:
      return <Badge variant="secondary">-</Badge>
  }
}

export function RecentActivity() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Atividades Recentes</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {mockActivities.map((activity) => (
            <div key={activity.id} className="flex items-center justify-between p-3 rounded-lg border border-border hover:bg-accent/50 transition-colors">
              <div className="flex-1">
                <p className="text-sm font-medium text-foreground">
                  {activity.description}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  {activity.timestamp}
                </p>
              </div>
              <div className="ml-4">
                {getStatusBadge(activity.status)}
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}