// Simple test to create abastecimento
const BASE_URL = 'http://localhost:8080';

async function testCreateAbastecimento() {
  console.log('Testing abastecimento creation...');
  
  const payload = {
    estabelecimento_id: 10,
    fornecedores_ids: [1],
    categoria_id: 1,
    telefone: "11999999999",
    ddi: "+55",
    email: "teste@foodmax.com",
    data_hora_recebido: null,
    observacao: "Teste de cadastro via API",
    status: "Pendente",
    email_enviado: false,
    itens: [{"item_id": 1, "quantidade": 10}],
    endereco: {
      cep: "01234567",
      endereco: "Rua Teste, 123",
      cidade: "São Paulo",
      uf: "SP",
      pais: "Brasil"
    }
  };

  console.log('Sending payload:', JSON.stringify(payload, null, 2));

  try {
    const response = await fetch(`${BASE_URL}/api/abastecimentos`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-user-id': '1'
      },
      body: JSON.stringify(payload)
    });

    console.log('Response status:', response.status);
    console.log('Response headers:', Object.fromEntries(response.headers.entries()));

    if (response.ok) {
      const result = await response.json();
      console.log('✅ SUCCESS! Abastecimento created:', result);
    } else {
      const errorText = await response.text();
      console.error('❌ FAILED! Response:', errorText);
    }
  } catch (error) {
    console.error('❌ ERROR:', error);
  }
}

testCreateAbastecimento();
