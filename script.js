function agenda() {
      const nome = document.getElementById('nome').value;
      const servico = document.getElementById('servico').value;
      const data = document.getElementById('data').value;
      const hora = document.getElementById('hora').value;

      if (!nome || !servico || !data || !hora) {
        alert('Por favor, preencha todos os campos.');
        return;
      }

      const lista = document.getElementById('listaAgendamentos');
      const timestamp = new Date(`${data}T${hora}`).getTime();

      const card = document.createElement('div');
      card.className = "agendamentos-card";
      card.dataset.timestamp = timestamp;

      const partesData = data.split('-');
      const dataBr = `${partesData[2]}/${partesData[1]}/${partesData[0]}`;

      card.innerHTML = `
        <p><strong>${nome}</strong> agendou <strong>${servico}</strong></p>
        <p>${dataBr} ${hora}</p>
      `;

      let inserido = false;
      const cardsExistentes = lista.querySelectorAll('.agendamentos-card');
      for (let c of cardsExistentes) {
        if (timestamp < parseInt(c.dataset.timestamp, 10)) {
          lista.insertBefore(card, c);
          inserido = true;
          break;
        }
      }
      if (!inserido) {
        lista.appendChild(card);
      }

      limparCampos();
    }

    function limparCampos() {
      document.getElementById('nome').value = '';
      document.getElementById('servico').value = '';
      document.getElementById('data').value = '';
      document.getElementById('hora').value = '';
    }
    