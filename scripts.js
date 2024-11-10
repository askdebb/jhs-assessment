import Learner from './Learner.js';
import fetchData from './QuotesAPI.js';



const student = new Learner();

student.name = "John";
student.age = 20;
student.gender = "Male";
student.email = "james@chris.com";
student.level = "JHS 3";

const learnerBucket = [];

learnerBucket.push({
  name: student.name,
  age: student.age,
  gender: student.gender,
  email: student.email,
  level: student.level,
});

let learnerCatTwo = 15;

let learnerPerfomance = student.catTwoPerformance(learnerCatTwo);
console.log("Learner performance: ",learnerPerfomance);

let overAllPerformance = student.finalResult(learnerCatTwo, 10);
console.log("Final Result: ", overAllPerformance);



console.log(learnerBucket);

localStorage.setItem("learner", JSON.stringify(learnerBucket));

const storedLearner = JSON.parse(localStorage.getItem("learner"));

console.log("stored learner: ", storedLearner);

storedLearner.map((eachLearner) => console.log(eachLearner.name));

//  localStorage.removeItem('learner');




document.getElementById("btn1").addEventListener('click', ()=>{
  fetchData();
});








// Example starter JavaScript for disabling form submissions if there are invalid fields
(() => {
  "use strict";

  // Fetch all the forms we want to apply custom Bootstrap validation styles to
  const forms = document.querySelectorAll(".needs-validation");

  // Loop over them and prevent submission
  Array.from(forms).forEach((form) => {
    form.addEventListener(
      "submit",
      (event) => {
        if (!form.checkValidity()) {
          event.preventDefault();
          event.stopPropagation();
        }

        form.classList.add("was-validated");
      },
      false
    );
  });
})();
