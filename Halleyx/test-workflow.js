const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function testWorkflow() {
  try {
    console.log('Testing workflow execution logic...\n');

    // Check if there are any manager users
    const managers = await prisma.user.findMany({
      where: { role: 'MANAGER' },
      select: { id: true, name: true, email: true, department: true }
    });

    console.log('Found managers:', managers.length);
    managers.forEach(m => console.log(`- ${m.name} (${m.email}) - ${m.department || 'No department'}`));

    if (managers.length === 0) {
      console.log('\n❌ No managers found. This will trigger the error "Manager role not configured in system"');
      return;
    }

    // Check existing requests
    const requests = await prisma.request.findMany({
      where: {
        request_data: {
          path: ['manager_approval_status'],
          equals: 'pending'
        }
      },
      include: {
        requester: {
          select: { id: true, name: true, email: true, department: true }
        }
      },
      orderBy: { created_at: 'desc' },
      take: 5
    });

    console.log('\nPending manager approvals:', requests.length);
    requests.forEach(r => {
      const data = r.request_data;
      console.log(`- Request ${r.id}: ${r.request_type} from ${r.requester?.name}`);
      console.log(`  Amount: ${data?.amount || 'N/A'}`);
      console.log(`  Status: ${r.status}`);
      console.log(`  Manager approval: ${data?.manager_approval_status}`);
      console.log(`  Next approver: ${data?.next_approver_role}`);
      console.log('');
    });

    // Check execution logs for manager steps
    const executionLogs = await prisma.executionLog.findMany({
      where: {
        step_name: 'Manager Approval',
        status: 'PENDING'
      },
      include: {
        request: {
          include: {
            requester: {
              select: { id: true, name: true, email: true }
            }
          }
        }
      },
      orderBy: { started_at: 'desc' },
      take: 5
    });

    console.log('Pending execution logs:', executionLogs.length);
    executionLogs.forEach(log => {
      console.log(`- Log ${log.id}: ${log.step_name}`);
      console.log(`  Request: ${log.request?.id} (${log.request?.request_type})`);
      console.log(`  Approver ID: ${log.approver_id}`);
      console.log(`  Status: ${log.status}`);
      console.log('');
    });

  } catch (error) {
    console.error('Error testing workflow:', error);
  } finally {
    await prisma.$disconnect();
  }
}

testWorkflow();
