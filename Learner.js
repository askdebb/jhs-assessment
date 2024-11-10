export default class Learner {
    constructor(name, age, gender, email, level) {
      this.name = name;
      this.age = age;
      this.gender = gender;
      this.email = email;
      this.level = level;
    }
  
    catTwoPerformance(result) {
      return (result / 20) * 100;
    }
  
    finalResult(catTwoResult, result) {
      return this.catTwoPerformance(catTwoResult) + result;
    }
  }