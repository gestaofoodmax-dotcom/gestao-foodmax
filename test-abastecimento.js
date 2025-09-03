// Test script to debug abastecimento creation
const BASE_URL = 'http://localhost:8080';

async function testAbastecimento() {
  console.log('=== TESTING ABASTECIMENTO CREATION ===');
  
  try {
    // First, test database connection
    console.log('\n1. Testing database connection...');
    const dbTest = await fetch(`${BASE_URL}/api/test-database`, {
      headers: {
        'x-user-id': '1'
      }
    });
    const dbResult = await dbTest.json();
    console.log('Database test result:', dbResult);

    // Second, check prerequisites - get estabelecimentos
    console.log('\n2. Getting estabelecimentos...');
    const estResponse = await fetch(`${BASE_URL}/api/estabelecimentos`, {
      headers: {
        'x-user-id': '1'
      }
    });
    const estabelecimentos = await estResponse.json();
    console.log('Estabelecimentos:', estabelecimentos);

    // Get fornecedores
    console.log('\n3. Getting fornecedores...');
    const fornResponse = await fetch(`${BASE_URL}/api/fornecedores`, {
      headers: {
        'x-user-id': '1'
      }
    });
    const fornecedores = await fornResponse.json();
    console.log('Fornecedores:', fornecedores);

    // Get categorias
    console.log('\n4. Getting categorias...');
    const catResponse = await fetch(`${BASE_URL}/api/itens/categorias`, {
      headers: {
        'x-user-id': '1'
      }
    });
    const categorias = await catResponse.json();
    console.log('Categorias:', categorias);

    // Get itens
    console.log('\n5. Getting itens...');
    const itensResponse = await fetch(`${BASE_URL}/api/itens`, {
      headers: {
        'x-user-id': '1'
      }
    });
    const itens = await itensResponse.json();
    console.log('Itens:', itens);

    // Check if we have data to work with
    if (!estabelecimentos.data || estabelecimentos.data.length === 0) {
      console.error('❌ No estabelecimentos found! Cannot proceed.');
      return;
    }
    if (!fornecedores.data || fornecedores.data.length === 0) {
      console.error('❌ No fornecedores found! Cannot proceed.');
      return;
    }
    if (!categorias.data || categorias.data.length === 0) {
      console.error('❌ No categorias found! Cannot proceed.');
      return;
    }
    if (!itens.data || itens.data.length === 0) {
      console.error('❌ No itens found! Cannot proceed.');
      return;
    }

    // Create test payload
    console.log('\n6. Creating test abastecimento...');
    const testPayload = {
      estabelecimento_id: estabelecimentos.data[0].id,
      fornecedores_ids: [fornecedores.data[0].id],
      categoria_id: categorias.data[0].id,
      telefone: "11999999999",
      ddi: "+55",
      email: "teste@foodmax.com",
      data_hora_recebido: null,
      observacao: "Teste de cadastro via script",
      status: "Pendente",
      email_enviado: false,
      itens: [{
        item_id: itens.data[0].id,
        quantidade: 10
      }],
      endereco: {
        cep: "01234567",
        endereco: "Rua Teste, 123",
        cidade: "São Paulo",
        uf: "SP",
        pais: "Brasil"
      }
    };

    console.log('Test payload:', JSON.stringify(testPayload, null, 2));

    // Submit the test data
    const createResponse = await fetch(`${BASE_URL}/api/abastecimentos`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-user-id': '1'
      },
      body: JSON.stringify(testPayload)
    });

    console.log('Response status:', createResponse.status);
    console.log('Response headers:', Object.fromEntries(createResponse.headers.entries()));

    if (createResponse.ok) {
      const result = await createResponse.json();
      console.log('✅ SUCCESS! Abastecimento created:', result);
      
      // Verify by listing abastecimentos
      console.log('\n7. Verifying creation by listing abastecimentos...');
      const listResponse = await fetch(`${BASE_URL}/api/abastecimentos`, {
        headers: {
          'x-user-id': '1'
        }
      });
      const abastecimentos = await listResponse.json();
      console.log('Current abastecimentos:', abastecimentos);
      
    } else {
      const errorText = await createResponse.text();
      console.error('❌ FAILED! Response:', errorText);
    }

  } catch (error) {
    console.error('❌ ERROR during test:', error);
  }
}

testAbastecimento();
