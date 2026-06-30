import { menuItems } from "../data/menu";

function Gastro() {
  const categories = Array.from(new Set(menuItems.map((item) => item.category)));

  return (
    <>
      <section className="pageHeader">
        <p>🍔 GASTRO</p>
        <h2>Speisekarte</h2>
        <span>Speisen & Getränke auf der Anlage</span>
      </section>

      <section className="gastroIntro">
        <b>TC Rot-Weiß Hürth-Gleuel</b>
        <span>Frisch, einfach, turniertauglich.</span>
      </section>

      <section className="menuGroups">
        {categories.map((category) => (
          <section className="menuGroup" key={category}>
            <div className="menuCategoryTitle">
              <span>{category}</span>
            </div>

            <div className="menuList">
              {menuItems
                .filter((item) => item.category === category)
                .map((item) => (
                  <article className="menuItem" key={item.name}>
                    <div className="menuText">
                      <h3>{item.name}</h3>
                      <p>{item.description}</p>
                    </div>

                    <strong>{item.price}</strong>
                  </article>
                ))}
            </div>
          </section>
        ))}
      </section>
    </>
  );
}

export default Gastro;