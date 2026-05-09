// window.addEventListener("keydown", function (e) {
//     if (e.keyCode === 114 || (e.ctrlKey && e.keyCode === 70)) {
//         e.preventDefault();
//         alert('search intent detected');
//     }
// });

window.addEventListener('DOMContentLoaded', (event) => {

    var docs_aside_list = document.getElementById("docs-aside-list");
    if (docs_aside_list) {

        let doc_h2 = document.getElementsByTagName("H2");
        var doc_sections = [];
        for (let i = 0; i < doc_h2.length; i++) {
            if (doc_h2[i].parentElement.tagName == 'SECTION'
                // && doc_h2[i].innerText.indexOf('Introduction')
            ) {
                doc_sections.push(doc_h2[i].parentElement);
                let list_item = document.createElement("LI");
                let link_element = document.createElement("A");
                link_element.href = '#' + doc_h2[i].parentElement.id;
                link_element.innerHTML = doc_h2[i].innerText;
                link_element.id = 'doc-side-a-' + doc_h2[i].parentElement.id;
                list_item.appendChild(link_element);

                document.getElementById("docs-aside-list").appendChild(list_item);
            }
        }

        $(window).scroll(function () {

            for (let i = 0; i < doc_sections.length; i++) {
                let rect = doc_sections[i].getBoundingClientRect();
                let link = document.getElementById('doc-side-a-' + doc_sections[i].id);
                if (rect.top <= 150 && rect.bottom > 150) {
                    link.classList.add("in-view");
                } else {
                    link.classList.remove("in-view");
                }
            }
        });
    }


    var multi_step_modal = document.getElementById("multi-step-modal");
    if (multi_step_modal) {
        var step = 1;

    }


});
function csatEvent() {
    var response_element = document.getElementById("csat-response");
    response_element.classList.add("show");
}
