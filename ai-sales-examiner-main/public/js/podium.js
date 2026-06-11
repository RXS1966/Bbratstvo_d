// function showExamPodium(data) {
//   const avatarCol = document.querySelector('.avatar-col');
//   if (!avatarCol) return;

//   let podium = document.getElementById('examResultPodium');

//   if (!podium) {
//     podium = document.createElement('div');
//     podium.id = 'examResultPodium';
//     avatarCol.appendChild(podium);
//   }

//   podium.innerHTML = `
//     <div style="color:white;">
//       Подиум работает
//     </div>
//   `;
// }
function showExamPodium(data) {
  const avatarCol = document.querySelector('.avatar-col');
  if (!avatarCol) return;

  // контейнер подиума
  let podium = document.getElementById('examResultPodium');

  if (!podium) {
    podium = document.createElement('div');
    podium.id = 'examResultPodium';
    avatarCol.appendChild(podium);
  }

  // 🔹 ЗАГОЛОВОК (выше подиума)
  let title = document.getElementById('examPodiumTitle');

  if (!title) {
    title = document.createElement('div');
    title.id = 'examPodiumTitle';
    title.style.color = 'white';
    title.style.fontSize = '20px';
    title.style.marginBottom = '10px';
    title.innerText = 'Результаты экзамена';
    
    avatarCol.insertBefore(title, podium); // ВСТАВЛЯЕМ НАД ПОДИУМОМ
  }

  // 🔹 САМ ПОДИУМ
  podium.innerHTML = `
    <div style="color:white;">
      Подиум работает
    </div>
  `;
}